import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Clock3, Save, Upload, RotateCcw, Search, LockKeyhole, Check, Gift, CalendarDays, Users, PartyPopper, Volume2, Heart, Sparkles, Ticket, Trophy, Star, BadgeDollarSign, Download, ImageDown, Move, Maximize2, Pencil, Plus, History } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { supabase } from './lib/supabase'

const EMPTY = { raffle_number:'', prize_name:'', prize_description:'', prize_image_url:'', total_numbers:100, price_per_number:20, draw_at:'', schedule_enabled:false, active:false, is_public:false, status:'DRAFT', sound_enabled:true, confetti_enabled:true }
const pad = (n, total=100) => String(n).padStart(String(Math.max(total, 99)).length, '0')
const money = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(Number(n||0))

const RAFFLE_MASCOT_DEFAULTS = {
  rafflePeekLeft:{size:105,x:0,y:0},
  rafflePeekRight:{size:105,x:0,y:0},
  raffleTicket:{size:115,x:0,y:0},
  rafflePrize:{size:105,x:0,y:0},
  raffleWhatsapp:{size:92,x:0,y:0},
  raffleCelebrate:{size:175,x:0,y:0},
}
function raffleMascotStyle(siteConfig,key){
  const v={...RAFFLE_MASCOT_DEFAULTS[key],...(siteConfig?.mascot_layout?.[key]||{})}
  return {'--raffle-mascot-size':`${v.size}px`,'--raffle-mascot-x':`${v.x}px`,'--raffle-mascot-y':`${v.y}px`}
}
function RaffleMascot({src,siteConfig,layoutKey,className='',editor=null}) {
  const values={...RAFFLE_MASCOT_DEFAULTS[layoutKey],...(editor?.layout?.[layoutKey]||siteConfig?.mascot_layout?.[layoutKey]||{})}
  const style={'--raffle-mascot-size':`${values.size}px`,'--raffle-mascot-x':`${values.x}px`,'--raffle-mascot-y':`${values.y}px`}
  const dragRef=useRef(null)

  function beginMove(e){
    if(!editor?.enabled)return
    e.preventDefault();e.stopPropagation();editor.onSelect(layoutKey)
    dragRef.current={mode:'move',pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,start:{...values}}
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function beginResize(e){
    if(!editor?.enabled)return
    e.preventDefault();e.stopPropagation();editor.onSelect(layoutKey)
    dragRef.current={mode:'resize',pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,start:{...values}}
    e.currentTarget.parentElement?.setPointerCapture?.(e.pointerId)
  }
  function move(e){
    const d=dragRef.current;if(!d||d.pointerId!==e.pointerId)return
    const dx=e.clientX-d.startX,dy=e.clientY-d.startY
    if(d.mode==='move')editor.onChange(layoutKey,{...d.start,x:Math.round(d.start.x+dx),y:Math.round(d.start.y+dy)})
    else editor.onChange(layoutKey,{...d.start,size:Math.max(28,Math.min(360,Math.round(d.start.size+(dx+dy)/2)))})
  }
  function end(e){if(dragRef.current?.pointerId===e.pointerId)dragRef.current=null}

  if(!editor?.enabled){
    return <img className={`raffle-mascot ${className}`} src={src} alt="" aria-hidden="true" draggable="false" style={style}/>
  }
  return <span className={`raffle-mascot-edit-wrap ${className} ${editor.selected===layoutKey?'is-selected':''}`} style={style}
    onPointerDown={beginMove} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
    <img className="raffle-mascot raffle-mascot-edit-image" src={src} alt="" aria-hidden="true" draggable="false"/>
    <span className="raffle-mascot-move-hint"><Move size={14}/></span>
    <button type="button" className="raffle-mascot-resize-handle" aria-label="Cambiar tamaño" onPointerDown={beginResize}><Maximize2 size={14}/></button>
  </span>
}


function remaining(drawAt){
  if(!drawAt) return {total:null,days:0,hours:0,minutes:0,seconds:0}
  const time=new Date(drawAt).getTime()
  if(!Number.isFinite(time)) return {total:null,days:0,hours:0,minutes:0,seconds:0}
  const ms=Math.max(0,time-Date.now())
  return {total:ms,days:Math.floor(ms/86400000),hours:Math.floor(ms/3600000)%24,minutes:Math.floor(ms/60000)%60,seconds:Math.floor(ms/1000)%60}
}

export function RafflePage({ raffle, siteConfig, onClose, adminMode=false, onSiteConfigChanged }){
  const [numbers,setNumbers]=useState([])
  const [selected,setSelected]=useState([])
  const [left,setLeft]=useState(()=>remaining(raffle.draw_at))
  const [stage,setStage]=useState(raffle.winner_number!=null ? 'final' : 'active')
  const [winner,setWinner]=useState(raffle.winner_number ? Number(raffle.winner_number) : null)
  const [drawError,setDrawError]=useState('')
  const drawLock=useRef(false)
  const celebrationTimer=useRef(null)
  const logo=siteConfig.logo_url||'/logo-cucui.jpg'
  const [designEdit,setDesignEdit]=useState(false)
  const [designConfirm,setDesignConfirm]=useState(false)
  const [selectedMascot,setSelectedMascot]=useState(null)
  const [designSaving,setDesignSaving]=useState(false)
  const [designMessage,setDesignMessage]=useState('')
  const [layoutDraft,setLayoutDraft]=useState(()=>({...RAFFLE_MASCOT_DEFAULTS,...(siteConfig?.mascot_layout||{})}))
  const layoutBeforeEdit=useRef(null)

  useEffect(()=>{if(!designEdit)setLayoutDraft({...RAFFLE_MASCOT_DEFAULTS,...(siteConfig?.mascot_layout||{})})},[siteConfig?.mascot_layout,designEdit])

  function changeMascot(key,next){setLayoutDraft(current=>({...current,[key]:next}))}
  function activateDesignEdit(){layoutBeforeEdit.current=JSON.parse(JSON.stringify(layoutDraft));setSelectedMascot(null);setDesignMessage('');setDesignConfirm(false);setDesignEdit(true)}
  function cancelDesignEdit(){if(layoutBeforeEdit.current)setLayoutDraft(layoutBeforeEdit.current);setSelectedMascot(null);setDesignEdit(false);setDesignMessage('')}
  async function saveVisualLayout(){
    if(!siteConfig?.id){setDesignMessage('No se encontró la configuración del sitio.');return}
    setDesignSaving(true);setDesignMessage('')
    const merged={...(siteConfig.mascot_layout||{}),...layoutDraft}
    const {data,error}=await supabase.from('site_config').update({mascot_layout:merged}).eq('id',siteConfig.id).select('*').single()
    if(error){setDesignMessage(error.message);setDesignSaving(false);return}
    onSiteConfigChanged?.(data);setDesignEdit(false);setSelectedMascot(null);setDesignSaving(false);setDesignMessage('Diseño guardado.')
  }
  const mascotEditor=adminMode&&designEdit?{enabled:true,layout:layoutDraft,selected:selectedMascot,onSelect:setSelectedMascot,onChange:changeMascot}:null

  useEffect(()=>{
    let cancelled=false
    async function loadNumbers(){
      const {data}=await supabase.from('raffle_numbers').select('number,status').eq('raffle_id',raffle.id).order('number')
      if(!cancelled)setNumbers(data||[])
    }
    loadNumbers()
    return()=>{cancelled=true}
  },[raffle.id])

  // El reloj solo se actualiza una vez por segundo. Al llegar a cero llama al sorteo UNA vez.
  useEffect(()=>{
    if(stage!=='active' || !raffle.draw_at)return
    const tick=()=>{
      const next=remaining(raffle.draw_at)
      setLeft(next)
      if(next.total!==null && next.total<=0) startDraw()
    }
    tick()
    const id=setInterval(tick,1000)
    return()=>clearInterval(id)
  },[stage,raffle.draw_at,raffle.id])

  // El festejo dura 20 segundos. Después la ruleta queda quieta con el ganador.
  useEffect(()=>{
    if(stage!=='celebrating')return
    celebrationTimer.current=setTimeout(()=>setStage('final'),20000)
    return()=>clearTimeout(celebrationTimer.current)
  },[stage])

  async function startDraw(){
    if(drawLock.current || stage!=='active')return
    drawLock.current=true
    setDrawError('')
    setLeft({total:0,days:0,hours:0,minutes:0,seconds:0})

    const {data,error}=await supabase.rpc('draw_raffle',{p_raffle_id:raffle.id})
    if(error){
      drawLock.current=false
      setDrawError(error.message.includes('No hay números')
        ? 'El sorteo está esperando porque todavía no hay números ocupados.'
        : error.message)
      return
    }

    const row = Array.isArray(data) ? data[0] : data
    const rawWinner = row?.winner_number ?? row?.draw_raffle ?? row
    const parsedWinner = Number(rawWinner)

    if (!Number.isFinite(parsedWinner)) {
      drawLock.current = false
      setDrawError('Supabase realizó el sorteo, pero no devolvió un número ganador válido.')
      console.error('Respuesta inesperada de draw_raffle:', data)
      return
    }

    setWinner(parsedWinner)
    setSelected([])
    setStage('spinning')
  }

  // Esta función se ejecuta SOLO cuando termina la animación CSS de 6 segundos.
  function handleSpinEnd(e){
    if(e.animationName!=='raffleSpinSixSeconds' || stage!=='spinning')return
    setStage('celebrating')
  }

  const soldNumbers=useMemo(()=>numbers.filter(n=>n.status==='SOLD'),[numbers])
  // La ruleta visual usa SOLO boletos ocupados, igual que el sorteo real.
  // Hasta 80 muestra todos. En rifas enormes compacta la visualización, pero siempre incluye al ganador.
  const wheelNumbers=useMemo(()=>{
    if(soldNumbers.length<=80)return soldNumbers
    const step=soldNumbers.length/80
    const sampled=Array.from({length:80},(_,i)=>soldNumbers[Math.min(soldNumbers.length-1,Math.floor(i*step))])
    if(winner!=null && !sampled.some(n=>Number(n.number)===Number(winner))){
      const winnerRow=soldNumbers.find(n=>Number(n.number)===Number(winner))
      if(winnerRow)sampled[sampled.length-1]=winnerRow
    }
    return sampled
  },[soldNumbers,winner])
  const wheelVisual=useMemo(()=>{
    const count=Math.max(1,wheelNumbers.length)
    if(count<=8)return {radius:38,label:54}
    if(count<=12)return {radius:40,label:48}
    if(count<=20)return {radius:41,label:40}
    if(count<=30)return {radius:42,label:32}
    if(count<=45)return {radius:43,label:25}
    if(count<=60)return {radius:44,label:20}
    return {radius:44.5,label:16}
  },[wheelNumbers.length])
  const sold=soldNumbers.length
  const active=stage==='active'
  const spinning=stage==='spinning'
  const celebrating=stage==='celebrating'
  const final=stage==='final'
  const scheduled=Boolean(raffle.draw_at)

  const wheelBackground=useMemo(()=>{
    const count=Math.max(1,wheelNumbers.length)
    const slice=360/count
    const palette=['#ff5f9e','#ffd36f','#fff0cf','#f58bb5']
    const stops=[]
    for(let i=0;i<count;i++){
      stops.push(`${palette[i%palette.length]} ${(i*slice).toFixed(4)}deg ${((i+1)*slice).toFixed(4)}deg`)
    }
    return `conic-gradient(from ${(-slice/2).toFixed(4)}deg, ${stops.join(',')})`
  },[wheelNumbers])

  function toggle(n){
    if(!active||raffle.status!=='ACTIVE'||n.status==='SOLD'||(scheduled && left.total!==null && left.total<=0))return
    setSelected(s=>s.includes(n.number)?s.filter(x=>x!==n.number):[...s,n.number].sort((a,b)=>a-b))
  }

  function whatsapp(){
    if(!selected.length)return
    const nums=selected.map(n=>pad(n,raffle.total_numbers)).join(', ')
    const total=selected.length*Number(raffle.price_per_number||0)
    const msg=`Hola 💕 Quiero apartar estos números de la rifa ${raffle.prize_name}: 🎟 ${nums}.\n\n${selected.length} número${selected.length>1?'s':''} · Total: ${money(total)}\n¿Me confirman disponibilidad? 🐹💗`
    window.open(`https://wa.me/${siteConfig.whatsapp_number}?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer')
  }

  return <div className="raffle-page raffle-festive-bg">
    <button className="raffle-close" onClick={onClose}><X/></button>
    {adminMode&&<div className="raffle-admin-live-tools">
      {!designEdit ? <button type="button" onClick={()=>setDesignConfirm(true)}><Pencil size={16}/> Editar diseño visual</button> : <>
        <span><Move size={15}/> Arrastra los cuyos · usa la esquina para cambiar tamaño</span>
        <button type="button" className="raffle-live-cancel" onClick={cancelDesignEdit}>Cancelar</button>
        <button type="button" className="raffle-live-save" onClick={saveVisualLayout} disabled={designSaving}><Save size={16}/>{designSaving?'Guardando...':'Guardar diseño'}</button>
      </>}
    </div>}
    {adminMode&&!raffle.is_public&&<div className="raffle-private-admin-badge"><LockKeyhole size={15}/><b>MODO ADMINISTRADOR</b><span>Esta rifa no es visible para clientes.</span></div>}
    {designConfirm&&<div className="raffle-edit-confirm-backdrop" onMouseDown={()=>setDesignConfirm(false)}><div className="raffle-edit-confirm" onMouseDown={e=>e.stopPropagation()}><div className="raffle-edit-confirm-icon"><Move/></div><h3>¿Activar edición visual?</h3><p>Podrás mover y cambiar el tamaño de los cuyos directamente sobre la rifa. Nada se guardará hasta que pulses <b>Guardar diseño</b>.</p><div><button type="button" onClick={()=>setDesignConfirm(false)}>Cancelar</button><button type="button" onClick={activateDesignEdit}>Activar edición</button></div></div></div>}
    {designMessage&&<div className="raffle-design-message">{designMessage}</div>}
    {celebrating&&raffle.confetti_enabled!==false&&<CelebrationFX/>}

    <main className="raffle-shell">
      <header className="raffle-header raffle-header-v7">
        <RaffleMascot src="/mascotas/rifas/cuyo-asomado-izquierda.png" siteConfig={siteConfig} layoutKey="rafflePeekLeft" className="raffle-mascot-peek-left" editor={mascotEditor}/>
        <RaffleMascot src="/mascotas/rifas/cuyo-asomado-derecha.png" siteConfig={siteConfig} layoutKey="rafflePeekRight" className="raffle-mascot-peek-right" editor={mascotEditor}/>
        <div className="raffle-header-ornament left"><Heart/><Sparkles/></div>
        <img className="raffle-logo" src={logo} alt="Ventitas Chiquitas Cucui"/>
        <div className="raffle-header-copy">
          <span className="raffle-eyebrow"><Ticket size={16}/> RIFA ESPECIAL <Ticket size={16}/></span>
          <h1>Ventitas Chiquitas Cucui</h1>
          <p>{active?'Pequeños detalles, grandes sonrisas':'Nuestro sorteo ya tiene resultado'}</p>
        </div>
        <div className="raffle-header-ornament right"><Sparkles/><Heart/></div>
      </header>
      <div className="raffle-decoration-strip raffle-decoration-v7"><Star/><Heart/><Sparkles/><Ticket/><Sparkles/><Heart/><Star/></div>

      <section className="raffle-prize raffle-prize-v7">
        <RaffleMascot src="/mascotas/rifas/cuyo-premio.png" siteConfig={siteConfig} layoutKey="rafflePrize" className="raffle-mascot-prize" editor={mascotEditor}/>
        <div className="raffle-prize-photo-wrap">
          <span className="prize-badge"><Gift size={15}/> PREMIO DE LA RIFA</span>
          {raffle.prize_image_url&&<img src={raffle.prize_image_url} alt={raffle.prize_name}/>}
          <i className="raffle-photo-spark one"/><i className="raffle-photo-spark two"/>
        </div>
        <div className="raffle-prize-copy">
          <span className="raffle-kicker"><Sparkles size={15}/> SORPRESA ESPECIAL</span>
          <h2>{raffle.prize_name}</h2>
          <p>{raffle.prize_description}</p>
          <div className="raffle-facts raffle-facts-v8">
            <span>
              <div className="raffle-fact-title"><BadgeDollarSign size={18}/><small>Precio del boleto</small></div>
              <b>{money(raffle.price_per_number)}</b>
              <em>MXN por número</em>
            </span>
            <span>
              <div className="raffle-fact-title"><Ticket size={18}/><small>Números</small></div>
              <b>{raffle.total_numbers}</b>
              <em>disponibles en la rifa</em>
            </span>
            <span className={!scheduled?'raffle-fact-pending':''}>
              <div className="raffle-fact-title"><CalendarDays size={18}/><small>Fecha del sorteo</small></div>
              {scheduled ? <>
                <b>{new Date(raffle.draw_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</b>
                <em>{new Date(raffle.draw_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</em>
              </> : <>
                <b>Próximamente</b>
                <em>La fecha se anunciará aquí</em>
              </>}
            </span>
          </div>
        </div>
      </section>

      {active&&<>
        {scheduled ? (
        <section className="raffle-countdown raffle-countdown-v7">
          <div className="raffle-section-title"><span><Clock3 size={19}/></span><div><small>EL SORTEO SE REALIZARÁ EN</small><h2>Tiempo restante</h2></div></div>
          <div className="raffle-clock-grid">
            <div><strong>{String(left.days).padStart(2,'0')}</strong><span>Días</span></div>
            <i/>
            <div><strong>{String(left.hours).padStart(2,'0')}</strong><span>Horas</span></div>
            <i/>
            <div><strong>{String(left.minutes).padStart(2,'0')}</strong><span>Minutos</span></div>
            <i/>
            <div><strong>{String(left.seconds).padStart(2,'0')}</strong><span>Segundos</span></div>
          </div>
          <p className="raffle-countdown-note"><Heart size={14}/> Cuando el contador llegue a cero comenzará el sorteo automáticamente. <Heart size={14}/></p>
          {left.total!==null&&left.total<300000&&left.total>0&&<b className="raffle-almost"><Sparkles size={15}/> Ya casi comienza. Prepárate para el sorteo <Sparkles size={15}/></b>}
          {drawError&&<b className="raffle-draw-error">{drawError}</b>}
        </section>
        ) : (
        <section className="raffle-date-pending">
          <div className="raffle-pending-icon"><CalendarDays size={27}/></div>
          <div>
            <small>FECHA DEL SORTEO</small>
            <h2>Próximamente</h2>
            <p>La fecha y hora aparecerán aquí cuando estén programadas.</p>
          </div>
          <Sparkles className="raffle-pending-sparkle" size={24}/>
        </section>
        )}

        <section className="raffle-number-section raffle-number-section-v7">
          <RaffleMascot src="/mascotas/rifas/cuyo-boleto.png" siteConfig={siteConfig} layoutKey="raffleTicket" className="raffle-mascot-ticket" editor={mascotEditor}/>
          <div className="raffle-number-heading">
            <div className="raffle-section-title"><span><Ticket size={19}/></span><div><small>ELIGE TUS FAVORITOS</small><h2>Números de la rifa</h2></div></div>
            <div className="raffle-progress">
              <strong>{sold} de {numbers.length}</strong><span>números ocupados</span>
              <div><i style={{width:`${numbers.length?sold/numbers.length*100:0}%`}}/></div>
              <small>{numbers.length?Math.round(sold/numbers.length*100):0}% completado</small>
            </div>
          </div>
          <div className="raffle-legend"><span><i className="available"/>Disponible</span><span><i className="chosen"/>Seleccionado</span><span><i className="sold"/>Ocupado</span></div>
          <p className="raffle-number-tip"><Ticket size={15}/> Toca uno o varios números disponibles para seleccionarlos.</p>
          <div className="raffle-number-grid raffle-public-grid-v11">{numbers.map(n=><button key={n.number} disabled={n.status==='SOLD'||(scheduled && left.total!==null && left.total<=0)} onClick={()=>toggle(n)} className={`${n.status==='SOLD'?'sold':''} ${selected.includes(n.number)?'chosen':''}`} aria-label={`Número ${pad(n.number,raffle.total_numbers)}${n.status==='SOLD'?', ocupado':selected.includes(n.number)?', seleccionado':', disponible'}`}><span>{pad(n.number,raffle.total_numbers)}</span></button>)}</div>
          {selected.length>0&&<div className="raffle-selection-bar raffle-selection-with-mascot"><RaffleMascot src="/mascotas/rifas/cuyo-whatsapp.png" siteConfig={siteConfig} layoutKey="raffleWhatsapp" className="raffle-mascot-whatsapp" editor={mascotEditor}/><div><span>Números seleccionados</span><b>{selected.map(n=>pad(n,raffle.total_numbers)).join(', ')}</b><strong>{selected.length} × {money(raffle.price_per_number)} = {money(selected.length*Number(raffle.price_per_number||0))}</strong></div><button onClick={whatsapp}><FaWhatsapp/> Apartar por WhatsApp</button></div>}
          <div className="raffle-community-note"><Heart size={22}/><div><b>Gracias por ser parte de esta rifa</b><small>Tu apartado se confirma después de verificar disponibilidad por WhatsApp.</small></div><Sparkles size={22}/></div>
        </section>
      </>}

      {!active&&<section className={`raffle-inline-draw ${spinning?'is-spinning':''} ${(celebrating||final)?'is-revealed':''} ${final?'is-final':''}`}>
        <span className="raffle-kicker">{spinning?'ES HORA DE LA RIFA':'TENEMOS GANADOR'}</span>
        <h2>{spinning?'La ruleta está girando...':celebrating?'Tenemos ganador':'Resultado final'}</h2>
        <p>{spinning?'Sorteando únicamente entre los números ocupados.':`El número ganador de ${raffle.prize_name} es:`}</p>
        <div className="raffle-wheel" style={{'--wheel-bg':wheelBackground}}>
          <div className="raffle-wheel-lights" aria-hidden="true"/>
          <div className="raffle-wheel-pointer" aria-hidden="true">♥</div>
          <div className={`raffle-wheel-ring ${wheelNumbers.length>24?'many-numbers':''}`} onAnimationEnd={handleSpinEnd}>
            {wheelNumbers.map((n,i)=>{
              const angle=(i*360)/Math.max(1,wheelNumbers.length)
              const rad=(angle-90)*Math.PI/180
              const radius=wheelVisual.radius
              const x=50+Math.cos(rad)*radius
              const y=50+Math.sin(rad)*radius
              const isWinner=!spinning && Number(n.number)===Number(winner)
              return <b key={n.number} className={isWinner?'wheel-winning-number':''}
                style={{left:`${x}%`,top:`${y}%`,'--label-size':`${wheelVisual.label}px`}}>
                {pad(n.number,raffle.total_numbers)}
              </b>
            })}
          </div>
          <div className="raffle-wheel-center">
            <span>{spinning?'':'★'}</span>
            <strong>{spinning?'?':pad(winner,raffle.total_numbers)}</strong>
            <small>{spinning?'SORTEANDO':'GANADOR'}</small>
          </div>
        </div>
        <div className="draw-mascots"><RaffleMascot src="/mascotas/rifas/cuyos-celebrando.png" siteConfig={siteConfig} layoutKey="raffleCelebrate" className="raffle-mascot-celebrate" editor={mascotEditor}/></div>
        <b className="raffle-inline-status">{spinning?'Girando la ruleta...':`Ganador: ${pad(winner,raffle.total_numbers)}`}</b>
        {final&&<small>Este es el resultado oficial de la rifa.</small>}
      </section>}
    </main>
  </div>
}


function CelebrationFX(){
  const symbols=['★','♥','✦','🎀','✨','●']
  return <div className="raffle-celebration-fx" aria-hidden="true">
    <div className="raffle-burst">{Array.from({length:36},(_,i)=><i key={`b-${i}`} style={{'--angle':`${i*10}deg`,'--distance':`${150+(i%6)*24}px`,'--delay':`${(i%7)*.06}s`}}>{symbols[i%symbols.length]}</i>)}</div>
    <div className="raffle-fall">{Array.from({length:48},(_,i)=><i key={`f-${i}`} style={{left:`${(i*37)%100}%`,'--delay':`${-(i%12)*.18}s`,'--duration':`${3.2+(i%6)*.35}s`,'--drift':`${((i%7)-3)*18}px`}}>{symbols[(i+2)%symbols.length]}</i>)}</div>
    <div className="raffle-celebration-glow"/>
  </div>
}


function toLocalDateTimeInput(value){
  if(!value)return ''
  const d=new Date(value)
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000)
  return local.toISOString().slice(0,16)
}


function roundedRect(ctx,x,y,w,h,r,fill,stroke=null,lineWidth=1){
  const rr=Math.min(r,w/2,h/2)
  ctx.beginPath()
  ctx.roundRect(x,y,w,h,rr)
  ctx.fillStyle=fill
  ctx.fill()
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke()}
}
function wrapCanvasText(ctx,text,maxWidth){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean)
  const lines=[];let line=''
  for(const word of words){
    const test=line?`${line} ${word}`:word
    if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test
  }
  if(line)lines.push(line)
  return lines
}
function loadCanvasImage(src){
  return new Promise((resolve,reject)=>{
    if(!src){resolve(null);return}
    const img=new Image()
    img.crossOrigin='anonymous'
    img.onload=()=>resolve(img)
    img.onerror=reject
    img.src=src
  })
}

export function RaffleAdmin({ onClose, onChanged }){
 const [raffle,setRaffle]=useState(null),[form,setForm]=useState(EMPTY),[numbers,setNumbers]=useState([]),[selected,setSelected]=useState([]),[siteConfig,setSiteConfig]=useState(null),[busy,setBusy]=useState(false),[exporting,setExporting]=useState(false),[error,setError]=useState(''),[jump,setJump]=useState(''),[history,setHistory]=useState([])
 useEffect(()=>{load()},[])
 async function load(targetId=null){
   const {data:site}=await supabase.from('site_config').select('*').order('id',{ascending:true}).limit(1).maybeSingle(); setSiteConfig(site||null)
   const {data:list,error:listError}=await supabase.from('raffles').select('*').order('raffle_number',{ascending:false}).order('created_at',{ascending:false})
   if(listError){setError(listError.message);return}
   setHistory(list||[])
   const data=targetId ? (list||[]).find(item=>item.id===targetId) : (list||[])[0]
   if(data){
     setRaffle(data);setForm({...data,draw_at:toLocalDateTimeInput(data.draw_at),schedule_enabled:Boolean(data.draw_at)});setSelected([])
     const r=await supabase.from('raffle_numbers').select('*').eq('raffle_id',data.id).order('number');setNumbers(r.data||[])
   }else{setRaffle(null);setForm({...EMPTY});setNumbers([]);setSelected([])}
 }
 function createNewRaffle(){
   setRaffle(null);setForm({...EMPTY});setNumbers([]);setSelected([]);setJump('');setError('')
 }
 async function upload(file){ if(!file)return; setBusy(true);try{const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`raffles/${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from('productos').upload(path,file,{upsert:false,cacheControl:'31536000'});if(error)throw error;const {data}=supabase.storage.from('productos').getPublicUrl(path);setForm(f=>({...f,prize_image_url:data.publicUrl}))}catch(e){setError(e.message)}finally{setBusy(false)} }
 async function save(e){
  e.preventDefault()
  setBusy(true)
  setError('')
  try{
    if(!form.prize_name.trim())throw new Error('Escribe el nombre del premio.')
    if(form.schedule_enabled && !form.draw_at)throw new Error('Elige fecha y hora del sorteo o desactiva la programación.')
    const payload={
      prize_name:form.prize_name.trim(),
      prize_description:form.prize_description.trim(),
      prize_image_url:form.prize_image_url||null,
      total_numbers:Math.max(1,Math.min(1000,Number(form.total_numbers))),
      price_per_number:Math.max(0,Number(form.price_per_number)),
      draw_at:form.schedule_enabled&&form.draw_at ? new Date(form.draw_at).toISOString() : null,
      active:Boolean(form.active),
      is_public:Boolean(form.active && form.is_public),
      status:raffle?.winner_number!=null?'FINISHED':(form.active?'ACTIVE':'DRAFT'),
      sound_enabled:Boolean(form.sound_enabled),
      confetti_enabled:Boolean(form.confetti_enabled)
    }
    if(form.raffle_number!=='' && form.raffle_number!=null)payload.raffle_number=Math.max(1,Number(form.raffle_number))
    // Solo puede haber una rifa activa/publicada a la vez. Las anteriores quedan en el historial.
    if(payload.active){
      let q=supabase.from('raffles').update({active:false,is_public:false})
      if(raffle?.id)q=q.neq('id',raffle.id)
      const off=await q.eq('active',true)
      if(off.error)throw off.error
    }
    let data
    if(raffle){
      const r=await supabase.from('raffles').update(payload).eq('id',raffle.id).select().single()
      if(r.error)throw r.error
      data=r.data
    }else{
      const r=await supabase.from('raffles').insert(payload).select().single()
      if(r.error)throw r.error
      data=r.data
    }
    const rpc=await supabase.rpc('sync_raffle_numbers',{p_raffle_id:data.id,p_total_numbers:payload.total_numbers})
    if(rpc.error)throw rpc.error
    await load(data.id)
    await onChanged?.()
  }catch(e){setError(e.message)}
  finally{setBusy(false)}
 }
 async function mark(status){if(!selected.length)return;setBusy(true);const {error}=await supabase.from('raffle_numbers').update({status,reserved_at:status==='SOLD'?new Date().toISOString():null}).eq('raffle_id',raffle.id).in('number',selected);if(error)setError(error.message);else{setSelected([]);await load(raffle.id)}setBusy(false)}

 function toggleAdminNumber(number){
   setSelected(s=>s.includes(number)?s.filter(x=>x!==number):[...s,number])
 }
 async function generateShareImage(){
   if(!raffle||!numbers.length)return
   setExporting(true);setError('')
   try{
     const W=1080,H=1350
     const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H
     const ctx=canvas.getContext('2d')
     const wine='#7f1238',wine2='#a51d4e',cream='#fff7ee',pink='#f7c6d7',rose='#e74f86',gold='#efbd62',ink='#711332'
     const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#68102f');grad.addColorStop(.48,wine);grad.addColorStop(1,'#4f0b25');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H)
     // subtle decorative dots
     ctx.globalAlpha=.13;ctx.fillStyle='#fff'
     for(let y=35;y<H;y+=55)for(let x=35+(y%110?15:0);x<W;x+=70){ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill()}
     ctx.globalAlpha=1
     roundedRect(ctx,45,42,990,160,34,cream,'#f2b5ca',4)
     // Logo real de la tienda
     let logo=null
     try{logo=await loadCanvasImage(siteConfig?.logo_url||'/logo-cucui.jpg')}catch{}
     if(logo){
       ctx.save();ctx.beginPath();ctx.arc(145,122,57,0,Math.PI*2);ctx.clip()
       const ls=Math.max(114/logo.width,114/logo.height),lw=logo.width*ls,lh=logo.height*ls
       ctx.drawImage(logo,145-lw/2,122-lh/2,lw,lh);ctx.restore()
       ctx.beginPath();ctx.arc(145,122,60,0,Math.PI*2);ctx.strokeStyle=rose;ctx.lineWidth=4;ctx.stroke()
     }
     // Adornos kawaii hechos por canvas
     ctx.fillStyle='#ef6d9c';ctx.beginPath();ctx.arc(935,88,13,0,Math.PI*2);ctx.fill()
     ctx.fillStyle=gold;ctx.save();ctx.translate(965,145);ctx.rotate(Math.PI/4);ctx.fillRect(-8,-8,16,16);ctx.restore()
     ctx.textAlign='center';ctx.fillStyle=wine;ctx.font='900 58px Fredoka, Arial';ctx.fillText('RIFA',585,105)
     ctx.font='900 31px Fredoka, Arial';ctx.fillText(siteConfig?.business_name||'Ventitas Chiquitas Cucui',585,150)
     ctx.fillStyle='#a95a76';ctx.font='800 19px Nunito, Arial';ctx.fillText('Pequeñas compras, grandes sonrisas',585,181)

     roundedRect(ctx,45,225,990,330,32,cream,'#f2b5ca',4)
     let img=null
     try{img=await loadCanvasImage(raffle.prize_image_url)}catch{}
     roundedRect(ctx,70,250,300,280,24,'#fbe1ea','#e58aaa',3)
     if(img){
       const s=Math.max(300/img.width,280/img.height),sw=img.width*s,sh=img.height*s
       ctx.save();ctx.beginPath();ctx.roundRect(70,250,300,280,24);ctx.clip();ctx.drawImage(img,70+(300-sw)/2,250+(280-sh)/2,sw,sh);ctx.restore()
     }else{
       ctx.fillStyle=wine;ctx.font='900 25px Fredoka, Arial';ctx.fillText('PREMIO',220,398)
     }
     ctx.textAlign='left';ctx.fillStyle=wine;ctx.font='900 38px Fredoka, Arial'
     const titleLines=wrapCanvasText(ctx,raffle.prize_name,590).slice(0,2)
     titleLines.forEach((l,i)=>ctx.fillText(l,405,280+i*44))
     ctx.font='700 20px Nunito, Arial';ctx.fillStyle='#805366'
     const desc=wrapCanvasText(ctx,raffle.prize_description||'',575).slice(0,4)
     desc.forEach((l,i)=>ctx.fillText(l,405,375+i*29))
     const cards=[
       ['PRECIO DEL BOLETO',money(raffle.price_per_number)],
       ['TOTAL DE NÚMEROS',String(raffle.total_numbers)],
       ['FECHA DEL SORTEO',raffle.draw_at?new Date(raffle.draw_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}):'Próximamente']
     ]
     cards.forEach((it,i)=>{
       const x=405+i*195
       roundedRect(ctx,x,460,180,72,15,'#fff0f5','#efb3c8',2)
       ctx.textAlign='center';ctx.fillStyle='#a65070';ctx.font='900 12px Nunito, Arial';ctx.fillText(it[0],x+90,483)
       ctx.fillStyle=wine;ctx.font=`900 ${i===2?18:25}px Fredoka, Arial`;ctx.fillText(it[1],x+90,515)
     })

     const sold=numbers.filter(n=>n.status==='SOLD').length,available=numbers.length-sold
     roundedRect(ctx,45,580,990,700,32,'#fff8f1','#f2b5ca',4)
     // Cinta decorativa para la tabla
     roundedRect(ctx,270,558,540,78,25,wine2,'#f2a9c3',4)
     ctx.fillStyle='#ffd9e6';ctx.beginPath();ctx.arc(300,596,9,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(780,596,9,0,Math.PI*2);ctx.fill()
     ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='900 38px Fredoka, Arial';ctx.fillText('Tabla de números',540,608)
     ctx.font='800 18px Nunito, Arial';ctx.fillStyle='#9a5670';ctx.fillText(`${sold} ocupados · ${available} disponibles`,540,664)
     // progress
     roundedRect(ctx,170,686,740,14,7,'#f3d5df')
     const pw=numbers.length?740*(sold/numbers.length):0
     if(pw>0)roundedRect(ctx,170,686,pw,14,7,rose)
     // Grid adapts to count, keeping readable.
     const count=numbers.length
     const cols=count<=30?6:count<=60?10:count<=100?10:12
     const rows=Math.ceil(count/cols)
     const gridX=80,gridY=735,gridW=920,gridH=455
     const gap=8,cellW=(gridW-gap*(cols-1))/cols,cellH=Math.min(58,(gridH-gap*(rows-1))/rows)
     const totalH=rows*cellH+(rows-1)*gap
     const startY=gridY+Math.max(0,(gridH-totalH)/2)
     ctx.font=`900 ${Math.max(15,Math.min(25,cellH*.43))}px Fredoka, Arial`
     numbers.forEach((n,i)=>{
       const col=i%cols,row=Math.floor(i/cols),x=gridX+col*(cellW+gap),y=startY+row*(cellH+gap)
       const occupied=n.status==='SOLD'
       roundedRect(ctx,x,y,cellW,cellH,Math.min(15,cellH*.28),occupied?wine2:'#fffdf8',occupied?'#6b0c2e':'#eab0c5',2)
       ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=occupied?'#fff':ink
       ctx.fillText(pad(n.number,raffle.total_numbers),x+cellW/2,y+cellH/2+1)
     })
     ctx.textBaseline='alphabetic'
     ctx.textAlign='center';ctx.font='800 17px Nunito, Arial'
     roundedRect(ctx,300,1210,210,42,14,'#fffdf8','#eab0c5',2);ctx.fillStyle=ink;ctx.fillText('Disponible',405,1237)
     roundedRect(ctx,535,1210,210,42,14,wine2,'#6b0c2e',2);ctx.fillStyle='#fff';ctx.fillText('Ocupado',640,1237)
     ctx.fillStyle='#ffe6ef';ctx.font='800 17px Nunito, Arial';ctx.fillText('Ventitas Chiquitas Cucui · Gracias por tu confianza',540,1320)

     const a=document.createElement('a')
     a.download=`rifa-${String(raffle.prize_name||'ventitas').toLowerCase().replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')}.png`
     a.href=canvas.toDataURL('image/png',1)
     a.click()
   }catch(e){setError(`No se pudo generar la imagen: ${e.message}`)}
   finally{setExporting(false)}
 }
 function go(){const n=Number(jump);if(!n)return;document.getElementById(`admin-raffle-${n}`)?.scrollIntoView({behavior:'smooth',block:'center'})}
 return <div className="modal-backdrop raffle-admin-backdrop"><div className="raffle-admin-modal" onMouseDown={e=>e.stopPropagation()}><header><div><span className="raffle-kicker"><Ticket size={16}/> ADMINISTRACIÓN</span><h2>Rifas</h2><p>Configura el premio, los números, la publicación y la programación del sorteo.</p></div><button className="modal-close" onClick={onClose}><X/></button></header>
<section className="raffle-admin-history">
  <div className="raffle-admin-history-head"><div><span><History size={16}/> HISTORIAL DE RIFAS</span><b>{raffle ? `Editando Rifa #${raffle.raffle_number||'—'}` : 'Creando nueva rifa'}</b></div><button type="button" onClick={createNewRaffle}><Plus size={17}/> Crear nueva rifa</button></div>
  {history.length>0&&<div className="raffle-history-list">{history.map(item=><button type="button" key={item.id} className={raffle?.id===item.id?'is-current':''} onClick={()=>load(item.id)}><strong>Rifa #{item.raffle_number||'—'}</strong><span>{item.prize_name||'Sin nombre'}</span><small>{item.winner_number!=null?`Finalizada · Ganador ${pad(item.winner_number,item.total_numbers)}`:item.active?(item.is_public?'Publicada':'Modo de prueba'):'Guardada'}</small></button>)}</div>}
  <div className="raffle-admin-idbox"><span>ID interno de Supabase</span><code>{raffle?.id||'Se generará automáticamente al guardar la nueva rifa'}</code><small>Solo se muestra en administración. No se enseña a los clientes y no se modifica para evitar romper boletos o resultados.</small></div>
</section>
<form className="raffle-admin-form" onSubmit={save}><div className="raffle-admin-fields"><div className="raffle-admin-visibility">
<label className="raffle-switch"><span>Rifa activa <small>Actívala para configurarla y probar la rifa completa desde el botón privado de la portada.</small></span><input type="checkbox" checked={Boolean(form.active)} onChange={e=>setForm(f=>({...f,active:e.target.checked,is_public:e.target.checked?f.is_public:false}))}/></label>
<label className="raffle-switch"><span>Mostrar en el catálogo <small>Si está apagado, los clientes no verán el botón de la rifa.</small></span><input type="checkbox" checked={Boolean(form.is_public)} disabled={!form.active} onChange={e=>setForm(f=>({...f,is_public:e.target.checked}))}/></label>
<div className={`raffle-visibility-status ${form.active&&form.is_public?'is-public':'is-test'}`}>
  <b>{form.active&&form.is_public?'RIFA PUBLICADA':form.active?'MODO DE PRUEBA':'RIFA DESACTIVADA'}</b>
  <small>{form.active&&form.is_public?'Los clientes pueden ver esta rifa en el catálogo.':form.active?'La rifa funciona para administración, pero todavía no aparece a los clientes.':'Activa la rifa cuando quieras comenzar a configurarla y probarla.'}</small>
</div>

</div><div className="raffle-admin-settings"><label className="raffle-switch"><span><Volume2 size={17}/> Sonido de la ruleta <small>Solo lo configura administración</small></span><input type="checkbox" checked={form.sound_enabled!==false} onChange={e=>setForm(f=>({...f,sound_enabled:e.target.checked}))}/></label><label className="raffle-switch"><span><PartyPopper size={17}/> Mostrar confeti</span><input type="checkbox" checked={form.confetti_enabled!==false} onChange={e=>setForm(f=>({...f,confetti_enabled:e.target.checked}))}/></label></div><label>Número de rifa <small className="raffle-field-help">Solo administración. Puedes dejarlo vacío en una rifa nueva para asignarlo automáticamente.</small><input type="number" min="1" value={form.raffle_number??''} onChange={e=>setForm(f=>({...f,raffle_number:e.target.value}))} placeholder="Automático"/></label><label>Nombre del premio<input value={form.prize_name} onChange={e=>setForm(f=>({...f,prize_name:e.target.value}))} placeholder="Ej. Kit Hello Kitty"/></label><label>Descripción<textarea value={form.prize_description} onChange={e=>setForm(f=>({...f,prize_description:e.target.value}))} placeholder="Describe brevemente el premio"/></label><div className="raffle-two"><label>Cantidad de números<input type="number" min="1" max="1000" value={form.total_numbers} onChange={e=>setForm(f=>({...f,total_numbers:e.target.value}))}/></label><label>Precio por número<input type="number" min="0" step="0.01" value={form.price_per_number} onChange={e=>setForm(f=>({...f,price_per_number:e.target.value}))}/></label></div><div className="raffle-schedule-admin">
<label className="raffle-switch raffle-schedule-switch"><span><CalendarDays size={17}/> Programar fecha del sorteo <small>Actívalo cuando quieras mostrar fecha, hora y contador.</small></span><input type="checkbox" checked={Boolean(form.schedule_enabled)} onChange={e=>setForm(f=>({...f,schedule_enabled:e.target.checked,draw_at:e.target.checked?f.draw_at:''}))}/></label>
{form.schedule_enabled
  ? <label className="raffle-schedule-date">Fecha y hora del sorteo<input type="datetime-local" value={form.draw_at||''} onChange={e=>setForm(f=>({...f,draw_at:e.target.value}))}/></label>
  : <div className="raffle-schedule-preview"><CalendarDays size={20}/><div><b>Fecha sin programar</b><small>La rifa puede permanecer visible y aceptar apartados. El cliente verá “Próximamente”.</small></div></div>}
</div><label className="raffle-upload"><span>Foto del premio</span>{form.prize_image_url&&<img src={form.prize_image_url}/>}<span className="raffle-upload-btn"><Upload size={17}/> Elegir imagen<input type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0])}/></span></label><button className="raffle-save" disabled={busy}><Save size={18}/>{busy?'Guardando...':'Guardar rifa'}</button>{error&&<p className="raffle-error">{error}</p>}</div></form>{raffle&&numbers.length>0&&<section className="raffle-admin-numbers raffle-admin-numbers-v10">
<div className="raffle-admin-number-head">
  <div><span className="raffle-admin-mini-title"><Ticket size={16}/> CONTROL DE BOLETOS</span><h3>Tabla de números</h3><p>Grande, clara y lista para actualizar tu rifa.</p></div>
  <div className="raffle-admin-head-tools">
    <button type="button" className="raffle-export-image" onClick={generateShareImage} disabled={exporting}><ImageDown size={17}/>{exporting?'Generando...':'Generar imagen para WhatsApp'}</button>
    <div className="raffle-jump"><Search size={16}/><input type="number" placeholder="Ir al #" value={jump} onChange={e=>setJump(e.target.value)}/><button type="button" onClick={go}>Ir</button></div>
  </div>
</div>
<div className="raffle-admin-stats">
  <span><small>Total</small><b>{numbers.length}</b></span>
  <span><small>Disponibles</small><b>{numbers.filter(n=>n.status!=='SOLD').length}</b></span>
  <span><small>Ocupados</small><b>{numbers.filter(n=>n.status==='SOLD').length}</b></span>
</div>
<div className="raffle-admin-progress"><i style={{width:`${numbers.length?numbers.filter(n=>n.status==='SOLD').length/numbers.length*100:0}%`}}/></div>
<div className="raffle-admin-legend"><span><i className="available"/>Disponible</span><span><i className="chosen"/>Seleccionado</span><span><i className="sold"/>Ocupado</span></div>
<div className="raffle-number-grid admin raffle-admin-grid-v10">{numbers.map(n=><button type="button" id={`admin-raffle-${n.number}`} key={n.number} className={`${n.status==='SOLD'?'sold':''} ${selected.includes(n.number)?'chosen':''}`} onClick={()=>toggleAdminNumber(n.number)}><span>{pad(n.number,raffle.total_numbers)}</span></button>)}</div>
<div className="raffle-admin-actions raffle-admin-actions-v10"><span><b>{selected.length}</b> seleccionados</span><button type="button" disabled={!selected.length||busy} onClick={()=>mark('SOLD')}><LockKeyhole size={15}/> Marcar ocupados</button><button type="button" disabled={!selected.length||busy} onClick={()=>mark('AVAILABLE')}><Check size={15}/> Marcar disponibles</button><button type="button" disabled={!selected.length} onClick={()=>setSelected([])}><RotateCcw size={15}/> Limpiar</button></div>
<p className="raffle-export-note"><Download size={15}/> La imagen se genera en PNG con el premio, descripción, precio y estado actual de todos los números.</p>
</section>}</div></div>
}
