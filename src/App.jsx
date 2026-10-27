import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, Archive, CalendarClock, Check, CheckCircle2,
  Clock3, Download, FileUp, Filter, Layers3, Pencil, Plus, Search,
  Trash2, Users, X, LockKeyhole, ListChecks, MessageSquare, Send, CalendarDays
} from 'lucide-react'

const STORE_KEY = 'tablero-productividad-v1'
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const fmtDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) : 'Sin fecha'
const diffDays = (a,b) => {
  if (!a || !b) return null
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`))/86400000)
}
const statusOf = (a) => a.executionDate ? 'finalizada' : (a.dueDate && a.dueDate < todayISO() ? 'retrasada' : 'en_curso')
const statusLabels = { en_curso:'En curso', retrasada:'Retrasada', finalizada:'Finalizada' }
const priorityLabels = { alta:'Alta', media:'Media', baja:'Baja' }
const plantOptions = ['PL BARRANQUILLA','PL MUÑA','PL JAMUNDÍ','PL GIRARDOTA','TODAS','N/A']
const initialData = {
  buckets: ['Sulfato ferroso','Sulfato de magnesio','Desarrollo de producto','Mejoras de proceso'],
  processes: ['I+D','Calidad','Producción','Mantenimiento','Ambiental'],
  members: ['Responsable por asignar'],
  activities: []
}
function loadStore() {
  try {
    const saved = localStorage.getItem(STORE_KEY)
    return saved ? { ...initialData, ...JSON.parse(saved) } : initialData
  } catch { return initialData }
}
function saveBlob(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}
function csvCell(v) { return `"${String(v ?? '').replace(/"/g,'""')}"` }

const emptyForm = () => ({
  id:'', title:'', description:'', bucket:'Sulfato ferroso', process:'I+D',
  responsible:'Responsable por asignar', priority:'media', plant:'N/A', requestDate:todayISO(),
  dueDate:'', executionDate:'', checklist:[], updates:[]
})

export default function App() {
  const [store, setStore] = useState(loadStore)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [checklistDraft, setChecklistDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [bucketFilter, setBucketFilter] = useState('todos')
  const [plantFilter, setPlantFilter] = useState('todos')
  const [notice, setNotice] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [configPasswordOpen, setConfigPasswordOpen] = useState(false)
  const [configPassword, setConfigPassword] = useState('')
  const [configPasswordError, setConfigPasswordError] = useState('')
  const [newBucket, setNewBucket] = useState('')
  const [newProcess, setNewProcess] = useState('')
  const [newMember, setNewMember] = useState('')

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(store)) }, [store])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 3200)
    return () => clearTimeout(t)
  }, [notice])

  const activities = useMemo(() => store.activities.map(a => ({...a, status:statusOf(a)})), [store.activities])
  const totals = useMemo(() => {
    const done = activities.filter(a => a.status === 'finalizada')
    const late = activities.filter(a => a.status === 'retrasada')
    const progress = activities.filter(a => a.status === 'en_curso')
    const durations = done.map(a => diffDays(a.requestDate,a.executionDate)).filter(n => n !== null)
    const onTime = done.filter(a => a.dueDate && a.executionDate <= a.dueDate).length
    return {
      total:activities.length, done:done.length, late:late.length, progress:progress.length,
      onTime, onTimePct:done.length ? Math.round(onTime/done.length*100) : 0,
      donePct:activities.length ? Math.round(done.length/activities.length*100) : 0,
      avgDays:durations.length ? Math.round(durations.reduce((s,n)=>s+n,0)/durations.length*10)/10 : 0
    }
  }, [activities])

  const filtered = useMemo(() => activities.filter(a => {
    const matchesQuery = `${a.title} ${a.description} ${a.responsible} ${a.bucket} ${a.process} ${a.plant || 'N/A'}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (statusFilter === 'todos' || a.status === statusFilter) && (bucketFilter === 'todos' || a.bucket === bucketFilter) && (plantFilter === 'todos' || (a.plant || 'N/A') === plantFilter)
  }).sort((a,b) => (b.requestDate || '').localeCompare(a.requestDate || '')), [activities,query,statusFilter,bucketFilter,plantFilter])

  const bucketStats = useMemo(() => store.buckets.map(bucket => {
    const list = activities.filter(a => a.bucket === bucket)
    const done = list.filter(a => a.status === 'finalizada').length
    return { name:bucket, total:list.length, done, late:list.filter(a=>a.status==='retrasada').length, pct:list.length?Math.round(done/list.length*100):0 }
  }).sort((a,b)=>b.total-a.total), [store.buckets,activities])

  const memberStats = useMemo(() => {
    const names = [...new Set([...store.members,...activities.map(a=>a.responsible).filter(Boolean)])]
    return names.map(name => {
      const list = activities.filter(a=>a.responsible===name)
      const completed = list.filter(a=>a.status==='finalizada')
      const durations = completed.map(a=>diffDays(a.requestDate,a.executionDate)).filter(n=>n !== null && n >= 0)
      const avgDays = durations.length ? Math.round(durations.reduce((sum,n)=>sum+n,0)/durations.length*10)/10 : null
      return {name,total:list.length,done:completed.length,late:list.filter(a=>a.status==='retrasada').length,progress:list.filter(a=>a.status==='en_curso').length,avgDays}
    }).filter(m=>m.total).sort((a,b)=>b.total-a.total)
  },[store.members,activities])

  const upcoming = useMemo(() => activities.filter(a => !a.executionDate && a.dueDate).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,5),[activities])

  function openNew() { setForm({...emptyForm(), checklist:[], updates:[]}); setChecklistDraft(''); setCommentDraft(''); setFormOpen(true) }
  function openEdit(a) { setForm({...a, plant:a.plant || 'N/A', checklist:Array.isArray(a.checklist)?a.checklist:[], updates:Array.isArray(a.updates)?a.updates:[]}); setChecklistDraft(''); setCommentDraft(''); setFormOpen(true) }
  function addChecklistItem() { const text=checklistDraft.trim(); if(!text) return; updateForm('checklist',[...(form.checklist||[]),{id:`${Date.now()}-${Math.random()}`,text,done:false}]); setChecklistDraft('') }
  function toggleChecklistItem(id) { updateForm('checklist',(form.checklist||[]).map(item=>item.id===id?{...item,done:!item.done}:item)) }
  function removeChecklistItem(id) { updateForm('checklist',(form.checklist||[]).filter(item=>item.id!==id)) }
  function addActivityUpdate() { const text=commentDraft.trim(); if(!text) return; const update={id:`${Date.now()}-${Math.random()}`,text,createdAt:new Date().toISOString(),author:'Usuario'}; updateForm('updates',[...(form.updates||[]),update]); setCommentDraft('') }
  function updateForm(key,value) { setForm(prev=>({...prev,[key]:value})) }
  function saveActivity(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    const activity = {...form, checklist:Array.isArray(form.checklist)?form.checklist:[], updates:Array.isArray(form.updates)?form.updates:[], id:form.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`, title:form.title.trim()}
    setStore(prev => ({
      ...prev,
      members: prev.members.includes(activity.responsible) ? prev.members : [...prev.members,activity.responsible],
      activities: form.id ? prev.activities.map(a=>a.id===form.id?activity:a) : [activity,...prev.activities]
    }))
    setFormOpen(false); setNotice(form.id ? 'Actividad actualizada.' : 'Actividad registrada.')
  }
  function finish(a) {
    const executionDate = todayISO()
    setStore(prev=>({...prev,activities:prev.activities.map(x=>x.id===a.id?{...x,executionDate}:x)}))
    setNotice('Actividad finalizada.')
  }
  function removeActivity(a) {
    if (!window.confirm(`¿Eliminar la actividad "${a.title}"? Esta acción no se puede deshacer.`)) return
    setStore(prev=>({...prev,activities:prev.activities.filter(x=>x.id!==a.id)}))
    setNotice('Actividad eliminada.')
  }
  function exportCSV() {
    const cols = [
      ['Actividad','title'],['Descripción','description'],['Cubo','bucket'],['Proceso','process'],
      ['Responsable','responsible'],['Planta','plant'],['Prioridad','priority'],['Fecha solicitud','requestDate'],
      ['Fecha límite','dueDate'],['Fecha ejecución','executionDate'],['Estado','status']
    ]
    const lines = [cols.map(c=>csvCell(c[0])).join(';'),...filtered.map(a=>cols.map(([_,k])=>csvCell(k==='status'?statusLabels[a.status]:k==='priority'?priorityLabels[a[k]]:k==='plant'?(a.plant||'N/A'):a[k])).join(';'))]
    saveBlob(`actividades_${todayISO()}.csv`,'\ufeff'+lines.join('\r\n'),'text/csv;charset=utf-8;')
  }
  function backup() { saveBlob(`respaldo_tablero_${todayISO()}.json`,JSON.stringify(store,null,2),'application/json') }
  function restore(e) {
    const file=e.target.files?.[0]; if(!file) return
    const reader=new FileReader()
    reader.onload=()=>{try{
      const parsed=JSON.parse(reader.result)
      if(!Array.isArray(parsed.activities)||!Array.isArray(parsed.buckets)) throw new Error('Formato')
      setStore({...initialData,...parsed}); setNotice('Respaldo importado correctamente.')
    }catch{setNotice('No se pudo importar el archivo. Verifica que sea un respaldo JSON del tablero.')}}
    reader.readAsText(file); e.target.value=''
  }
  function addCatalog(type,value,setter) {
    const clean=value.trim(); if(!clean) return
    setStore(prev=>prev[type].includes(clean)?prev:{...prev,[type]:[...prev[type],clean]})
    setter(''); setNotice('Catálogo actualizado.')
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={22}/></div><div><strong>Productividad</strong><span>Tablero de gestión</span></div></div>
      <div className="side-label">ESPACIO DE TRABAJO</div>
      <div className="nav-item active"><Layers3 size={18}/> Resumen</div>
      <div className="nav-item" onClick={()=>document.getElementById('activity-list')?.scrollIntoView({behavior:'smooth'})}><CheckCircle2 size={18}/> Actividades</div>
      <div className="nav-item" onClick={()=>{setConfigPassword('');setConfigPasswordError('');setConfigPasswordOpen(true)}}><Archive size={18}/> Configuración</div>
      <div className="sidebar-bottom"><div className="online-dot"/> Guardado local automático<span>Versión gratuita</span></div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><div className="eyebrow">{new Date().toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div><h1>Tablero de productividad</h1><p>Resumen de actividades, plazos y desempeño del equipo.</p></div>
        <button className="primary" onClick={openNew}><Plus size={17}/> Nueva actividad</button>
      </header>

      {notice && <div className="notice"><Check size={16}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}

      <section className="kpi-grid">
        <Kpi icon={<Layers3/>} label="Actividades" value={totals.total} sub="Registradas en total" tone="teal"/>
        <Kpi icon={<Clock3/>} label="En curso" value={totals.progress} sub="Con plazo vigente" tone="blue"/>
        <Kpi icon={<AlertTriangle/>} label="Retrasadas" value={totals.late} sub="Plazo vencido sin cerrar" tone="red"/>
        <Kpi icon={<CheckCircle2/>} label="Finalizadas" value={totals.done} sub={`${totals.donePct}% del total`} tone="green"/>
        <Kpi icon={<CalendarClock/>} label="Promedio de cierre" value={`${totals.avgDays} d`} sub={`${totals.onTimePct}% finalizadas a tiempo`} tone="purple"/>
      </section>

      <section className="overview-grid">
        <div className="panel bucket-panel">
          <div className="panel-heading"><div><h2>Avance por cubo</h2><p>Actividades finalizadas sobre el total</p></div><Layers3 size={19}/></div>
          {bucketStats.length ? <div className="bucket-list">{bucketStats.map(b=><div className="bucket-row" key={b.name}>
            <div className="bucket-info"><span className="bucket-name">{b.name}</span><span>{b.done}/{b.total}</span></div>
            <div className="progress-track"><div className="progress-fill" style={{width:`${b.pct}%`}}/></div>
            <div className="bucket-foot"><span>{b.late} retrasadas</span><strong>{b.pct}%</strong></div>
          </div>)}</div> : <Empty text="Agrega actividades para ver el avance por cubo."/>}
        </div>
        <div className="panel upcoming-panel">
          <div className="panel-heading"><div><h2>Próximas a vencer</h2><p>Actividades abiertas con fecha límite</p></div><CalendarClock size={19}/></div>
          {upcoming.length ? <div className="upcoming-list">{upcoming.map(a=><div className="upcoming-item" key={a.id}>
            <div className={`due-icon ${a.status==='retrasada'?'late':''}`}><CalendarClock size={17}/></div><div className="upcoming-text"><strong>{a.title}</strong><span>{a.responsible} · {a.bucket} · {a.plant || 'N/A'}</span></div><div className="due-date"><strong>{fmtDate(a.dueDate)}</strong><span className={a.status==='retrasada'?'text-red':''}>{a.status==='retrasada'?`${Math.abs(diffDays(todayISO(),a.dueDate))} d de atraso`:a.dueDate===todayISO()?'Vence hoy':`Faltan ${diffDays(todayISO(),a.dueDate)} d`}</span></div>
          </div>)}</div> : <Empty text="No hay actividades pendientes con fecha límite."/>}
        </div>
      </section>

      <section className="panel team-panel">
        <div className="panel-heading"><div><h2>Productividad por responsable</h2><p>Avance de tareas y días promedio desde la solicitud hasta el cierre</p></div><Users size={19}/></div>
        {memberStats.length ? <div className="table-wrap"><table><thead><tr><th>Responsable</th><th>Total</th><th>Finalizadas</th><th>En curso</th><th>Retrasadas</th><th>Avance</th><th>Tiempo promedio de cierre</th></tr></thead><tbody>
          {memberStats.map(m=><tr key={m.name}><td><div className="person-cell"><span className="avatar">{m.name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}</span><strong>{m.name}</strong></div></td><td>{m.total}</td><td><span className="status-pill done">{m.done}</span></td><td><span className="status-pill progress">{m.progress}</span></td><td><span className="status-pill late">{m.late}</span></td><td><div className="mini-progress"><div className="progress-track"><div className="progress-fill" style={{width:`${Math.round(m.done/m.total*100)}%`}}/></div><span>{Math.round(m.done/m.total*100)}%</span></div></td><td>{m.avgDays === null ? 'N/D' : `${m.avgDays} d`}</td></tr>)}
        </tbody></table></div> : <Empty text="La productividad por responsable aparecerá cuando registres actividades."/>}
      </section>

      <section className="panel activity-panel" id="activity-list">
        <div className="activity-heading"><div><h2>Registro de actividades</h2><p>Consulta, filtra y actualiza los compromisos del equipo.</p></div><div className="toolbar-actions"><button className="secondary" onClick={exportCSV}><Download size={16}/> Exportar CSV</button><button className="secondary" onClick={backup}><Archive size={16}/> Respaldo</button></div></div>
        <div className="filters">
          <div className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar actividad, responsable, planta, cubo..."/></div>
          <div className="select-wrap"><Filter size={15}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="todos">Todos los estados</option><option value="en_curso">En curso</option><option value="retrasada">Retrasadas</option><option value="finalizada">Finalizadas</option></select></div>
          <select value={bucketFilter} onChange={e=>setBucketFilter(e.target.value)}><option value="todos">Todos los cubos</option>{store.buckets.map(b=><option key={b}>{b}</option>)}</select>
          <select aria-label="Filtrar por planta" value={plantFilter} onChange={e=>setPlantFilter(e.target.value)}><option value="todos">Todas las plantas (sin filtro)</option>{plantOptions.map(plant=><option key={plant} value={plant}>{plant}</option>)}</select>
        </div>
        {filtered.length ? <div className="table-wrap"><table className="activities-table"><thead><tr><th>Actividad</th><th>Planta</th><th>Cubo / proceso</th><th>Responsable</th><th>Prioridad</th><th>Fecha límite</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
          {filtered.map(a=><tr key={a.id}><td className="activity-title-cell"><strong>{a.title}</strong>{a.description&&<span>{a.description}</span>}{Array.isArray(a.checklist)&&a.checklist.length>0&&<span>Lista: {a.checklist.filter(i=>i.done).length}/{a.checklist.length} completados</span>}{Array.isArray(a.updates)&&a.updates.length>0&&<span>{a.updates.length} actualización(es)</span>}</td><td>{a.plant || 'N/A'}</td><td>{a.bucket}<small>{a.process}</small></td><td>{a.responsible}</td><td><span className={`priority ${a.priority}`}>{priorityLabels[a.priority]}</span></td><td>{fmtDate(a.dueDate)}</td><td><span className={`status-label ${a.status}`}>{statusLabels[a.status]}</span></td><td><div className="row-actions">{a.status!=='finalizada'&&<button title="Finalizar" onClick={()=>finish(a)}><CheckCircle2 size={16}/></button>}<button title="Editar" onClick={()=>openEdit(a)}><Pencil size={16}/></button><button title="Eliminar" onClick={()=>removeActivity(a)}><Trash2 size={16}/></button></div></td></tr>)}
        </tbody></table></div> : <div className="empty-table"><div className="empty-icon"><Activity size={22}/></div><strong>{activities.length?'No hay coincidencias':'Tu tablero está listo para empezar'}</strong><p>{activities.length?'Cambia los filtros o el término de búsqueda.':'Registra la primera actividad para comenzar a medir el cumplimiento.'}</p>{!activities.length&&<button className="primary" onClick={openNew}><Plus size={16}/> Registrar actividad</button>}</div>}
        <div className="table-footer"><span>{filtered.length} actividad(es) mostradas</span><span>Los estados se actualizan automáticamente según las fechas.</span></div>
      </section>
      <footer className="footer">Tablero de productividad · Aplicación gratuita de seguimiento · Datos guardados en este navegador</footer>
    </main>

    {formOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setFormOpen(false)}}><div className="modal">
      <div className="modal-head"><div><h2>{form.id?'Editar actividad':'Nueva actividad'}</h2><p>Registra el compromiso y sus fechas de seguimiento.</p></div><button className="icon-button" onClick={()=>setFormOpen(false)}><X size={19}/></button></div>
      <form onSubmit={saveActivity}>
        <label className="field full">Nombre de la actividad *<input required autoFocus value={form.title} onChange={e=>updateForm('title',e.target.value)} placeholder="Ej. Validar parámetros de proceso"/></label>
        <label className="field full">Descripción<textarea value={form.description} onChange={e=>updateForm('description',e.target.value)} rows="2" placeholder="Objetivo, entregable o contexto"/></label>
        <div className="form-grid">
          <label className="field">Cubo<select value={form.bucket} onChange={e=>updateForm('bucket',e.target.value)}>{store.buckets.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="field">Proceso<select value={form.process} onChange={e=>updateForm('process',e.target.value)}>{store.processes.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="field">Responsable<select value={form.responsible} onChange={e=>updateForm('responsible',e.target.value)}>{store.members.map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="field">Planta<select required value={form.plant || 'N/A'} onChange={e=>updateForm('plant',e.target.value)}>{plantOptions.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label className="field">Prioridad<select value={form.priority} onChange={e=>updateForm('priority',e.target.value)}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label>
          <label className="field">Fecha de solicitud<input type="date" required value={form.requestDate} onChange={e=>updateForm('requestDate',e.target.value)}/></label>
          <label className="field">Fecha límite<input type="date" value={form.dueDate||''} onChange={e=>updateForm('dueDate',e.target.value)}/></label>
          <label className="field full">Fecha de ejecución (dejar vacía si sigue abierta)<input type="date" value={form.executionDate||''} onChange={e=>updateForm('executionDate',e.target.value)}/></label>
        </div>
        <section className="activity-extra-section">
          <div className="extra-heading"><ListChecks size={17}/><div><h3>Lista de verificación</h3><p>Agrega pasos y marca cada uno cuando esté terminado.</p></div></div>
          <div className="inline-add checklist-add"><input value={checklistDraft} onChange={e=>setChecklistDraft(e.target.value)} placeholder="Escribe un paso de la lista" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addChecklistItem()}}}/><button type="button" className="secondary" onClick={addChecklistItem}><Plus size={15}/> Agregar paso</button></div>
          {(form.checklist||[]).length>0 ? <div className="checklist-items">{form.checklist.map(item=><div className="checklist-item" key={item.id}><label><input type="checkbox" checked={!!item.done} onChange={()=>toggleChecklistItem(item.id)}/><span className={item.done?'checklist-done':''}>{item.text}</span></label><button type="button" className="icon-button" aria-label="Eliminar paso" onClick={()=>removeChecklistItem(item.id)}><X size={14}/></button></div>)}<div className="checklist-progress"><div className="progress-track"><div className="progress-fill" style={{width:`${Math.round(form.checklist.filter(i=>i.done).length/form.checklist.length*100)}%`}}/></div><span>{form.checklist.filter(i=>i.done).length} de {form.checklist.length} completados</span></div></div> : <p className="extra-empty">Aún no hay pasos en esta lista.</p>}
        </section>
        <section className="activity-extra-section">
          <div className="extra-heading"><MessageSquare size={17}/><div><h3>Comentarios y seguimiento</h3><p>Registra avances, acuerdos, novedades o bloqueos de esta actividad.</p></div></div>
          <label className="field full">Nueva actualización<textarea value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} rows="2" placeholder="Describe el avance o seguimiento..."/></label>
          <div className="update-submit"><button type="button" className="secondary" onClick={addActivityUpdate} disabled={!commentDraft.trim()}><Send size={14}/> Agregar actualización</button></div>
          {(form.updates||[]).length>0 ? <div className="activity-updates">{[...form.updates].reverse().map(update=><article className="activity-update" key={update.id}><div className="update-meta"><strong>{update.author||'Usuario'}</strong><span><CalendarDays size={12}/> {new Date(update.createdAt).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'})}</span></div><p>{update.text}</p></article>)}</div> : <p className="extra-empty">Todavía no hay actualizaciones registradas.</p>}
        </section>
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setFormOpen(false)}>Cancelar</button><button type="submit" className="primary"><Check size={16}/> Guardar actividad</button></div>
      </form>
    </div></div>}

    {configPasswordOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setConfigPasswordOpen(false)}}><div className="modal" style={{maxWidth:420}}>
      <div className="modal-head"><div><h2>Acceso a Configuración</h2><p>Ingresa la contraseña para administrar catálogos y respaldos.</p></div><button className="icon-button" onClick={()=>setConfigPasswordOpen(false)}><X size={19}/></button></div>
      <form onSubmit={e=>{e.preventDefault();if(configPassword==='2410'){setConfigPasswordOpen(false);setSettingsOpen(true);setConfigPassword('');setConfigPasswordError('')}else{setConfigPasswordError('Contraseña incorrecta. Intenta nuevamente.');setConfigPassword('')}}}>
        <label className="field full">Contraseña<input type="password" autoFocus required value={configPassword} onChange={e=>setConfigPassword(e.target.value)} placeholder="Ingresa la contraseña" autoComplete="current-password"/></label>
        {configPasswordError && <p role="alert" style={{color:'#c4473a',fontSize:12,marginTop:10}}>{configPasswordError}</p>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setConfigPasswordOpen(false)}>Cancelar</button><button type="submit" className="primary"><LockKeyhole size={16}/> Acceder</button></div>
      </form>
    </div></div>}

    {settingsOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false)}}><div className="modal settings-modal">
      <div className="modal-head"><div><h2>Configuración</h2><p>Personaliza las opciones disponibles en el formulario.</p></div><button className="icon-button" onClick={()=>setSettingsOpen(false)}><X size={19}/></button></div>
      <div className="catalog-section"><h3>Cubos de trabajo</h3><div className="catalog-list">{store.buckets.map(x=><span key={x}>{x}<button onClick={()=>{if(store.activities.some(a=>a.bucket===x)){setNotice('No puedes eliminar un cubo que tiene actividades.');return}setStore(p=>({...p,buckets:p.buckets.filter(y=>y!==x)}))}}><X size={13}/></button></span>)}</div><div className="inline-add"><input value={newBucket} onChange={e=>setNewBucket(e.target.value)} placeholder="Nuevo cubo"/><button className="secondary" onClick={()=>addCatalog('buckets',newBucket,setNewBucket)}><Plus size={15}/> Agregar</button></div></div>
      <div className="catalog-section"><h3>Procesos</h3><div className="catalog-list">{store.processes.map(x=><span key={x}>{x}<button onClick={()=>{if(store.activities.some(a=>a.process===x)){setNotice('No puedes eliminar un proceso que tiene actividades.');return}setStore(p=>({...p,processes:p.processes.filter(y=>y!==x)}))}}><X size={13}/></button></span>)}</div><div className="inline-add"><input value={newProcess} onChange={e=>setNewProcess(e.target.value)} placeholder="Nuevo proceso"/><button className="secondary" onClick={()=>addCatalog('processes',newProcess,setNewProcess)}><Plus size={15}/> Agregar</button></div></div>
      <div className="catalog-section"><h3>Responsables</h3><div className="catalog-list">{store.members.map(x=><span key={x}>{x}<button onClick={()=>{if(store.activities.some(a=>a.responsible===x)){setNotice('No puedes eliminar un responsable que tiene actividades.');return}setStore(p=>({...p,members:p.members.filter(y=>y!==x)}))}}><X size={13}/></button></span>)}</div><div className="inline-add"><input value={newMember} onChange={e=>setNewMember(e.target.value)} placeholder="Nombre del responsable"/><button className="secondary" onClick={()=>addCatalog('members',newMember,setNewMember)}><Plus size={15}/> Agregar</button></div></div>
      <div className="catalog-section backup-section"><h3>Respaldo de datos</h3><p>Exporta tus datos a JSON para guardarlos o restaurarlos en otro navegador.</p><div className="toolbar-actions"><button className="secondary" onClick={backup}><Download size={16}/> Exportar respaldo</button><label className="secondary upload-button"><FileUp size={16}/> Importar respaldo<input type="file" accept=".json,application/json" onChange={restore}/></label></div></div>
      <div className="modal-actions"><button className="primary" onClick={()=>setSettingsOpen(false)}>Listo</button></div>
    </div></div>}
  </div>
}

function Kpi({icon,label,value,sub,tone}) {
  return <div className="kpi-card"><div className={`kpi-icon ${tone}`}>{React.cloneElement(icon,{size:19})}</div><span className="kpi-label">{label}</span><strong className="kpi-value">{value}</strong><span className="kpi-sub">{sub}</span></div>
}
function Empty({text}) { return <div className="empty-inline"><Activity size={20}/><span>{text}</span></div> }
