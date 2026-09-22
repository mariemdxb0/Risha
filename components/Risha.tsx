'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Bold, CheckSquare, ChevronLeft, FileText, Hash, Italic, Moon, Pin, Plus, Quote, Search, Sparkles, Sun, Trash2, Undo2, Redo2, BookOpen } from 'lucide-react';

type Note = { id:string; title:string; body:string; pinned:boolean; archived:boolean; deleted:boolean; createdAt:number; updatedAt:number; };
type View = 'all'|'pinned'|'archived'|'trash';

const formatDate=(t:number)=>new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(new Date(t));
const formatTime=(t:number)=>new Intl.DateTimeFormat('en',{hour:'2-digit',minute:'2-digit'}).format(new Date(t));
const todayStart=()=>{const d=new Date(); d.setHours(0,0,0,0); return d.getTime();};
const stripHtml=(value:string)=>value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();

export default function Risha(){
  const [notes,setNotes]=useState<Note[]>([]);
  const [selectedId,setSelectedId]=useState<string | null>(null);
  const [view,setView]=useState<View>('all');
  const [query,setQuery]=useState('');
  const [dark,setDark]=useState(false);
  const [mobileView,setMobileView]=useState<'notes'|'editor'>('notes');
  const [toast,setToast]=useState<string | null>(null);
  const bodyRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    try {
      const saved=localStorage.getItem('risha-notes');
      if(saved){
        const parsed=JSON.parse(saved);
        if(Array.isArray(parsed)) {
          const hasSeedNotes = parsed.some((note:any) => note && typeof note === 'object' && (note.title === 'Untitled note' || note.title === 'Welcome to Risha' || note.title === 'Welcome'));
          if(hasSeedNotes || parsed.length === 0) {
            localStorage.removeItem('risha-notes');
            setNotes([]);
          } else {
            setNotes(parsed);
          }
        }
      }
    } catch {
      localStorage.removeItem('risha-notes');
      setNotes([]);
    }
    const savedDark=localStorage.getItem('risha-dark');
    if(savedDark==='1') setDark(true);
  },[]);

  useEffect(()=>{ localStorage.setItem('risha-notes',JSON.stringify(notes)); },[notes]);
  useEffect(()=>{ document.documentElement.dataset.theme=dark?'dark':'light'; localStorage.setItem('risha-dark',dark?'1':'0'); },[dark]);
  useEffect(()=>{ if(!toast) return; const t=window.setTimeout(()=>setToast(null),1800); return ()=>window.clearTimeout(t); },[toast]);
  useEffect(()=>{ const onKey=(e:KeyboardEvent)=>{ if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault(); document.getElementById('risha-search')?.focus();} if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='n'){e.preventDefault(); createNote();} }; window.addEventListener('keydown',onKey); return()=>window.removeEventListener('keydown',onKey); },[notes]);

  const selected=notes.find(n=>n.id===selectedId) || null;
  const activeNotes=useMemo(()=>{
    let list=notes;
    if(view==='all') list=list.filter(n=>!n.archived&&!n.deleted);
    if(view==='pinned') list=list.filter(n=>n.pinned&&!n.archived&&!n.deleted);
    if(view==='archived') list=list.filter(n=>n.archived&&!n.deleted);
    if(view==='trash') list=list.filter(n=>n.deleted);
    if(query.trim()) { const q=query.toLowerCase(); list=list.filter(n=>(n.title+' '+n.body).toLowerCase().includes(q)); }
    return [...list].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt);
  },[notes,view,query]);

  const createNote=()=>{
    const n:Note={id:crypto.randomUUID(),title:'Untitled note',body:'',pinned:false,archived:false,deleted:false,createdAt:Date.now(),updatedAt:Date.now()};
    setNotes(x=>[n,...x]);
    setSelectedId(n.id);
    setView('all');
    setMobileView('editor');
    setTimeout(()=>document.getElementById('note-title')?.focus(),30);
  };

  const update=(patch:Partial<Note>)=>{ if(!selected) return; setNotes(x=>x.map(n=>n.id===selected.id?{...n,...patch,updatedAt:Date.now()}:n)); };
  const choose=(id:string)=>{setSelectedId(id); setMobileView('editor');};
  const goBackToNotes=()=>{
    if(mobileView==='notes'){
      setSelectedId(null);
      setView('all');
      return;
    }
    setMobileView('notes');
  };

  const deleteCurrentNote=()=>{
    if(!selected) return;
    if(selected.deleted){
      setNotes(x=>x.filter(n=>n.id!==selected.id));
      setSelectedId(null);
      setToast('Note permanently deleted');
      return;
    }

    setNotes(x=>x.map(n=>n.id===selected.id?{...n,deleted:true,archived:false,updatedAt:Date.now()}:n));
    setSelectedId(null);
    setToast('Note moved to trash');
    setView('all');
    setMobileView('notes');
  };

  const restore=()=>{
    if(!selected || !selected.deleted) return;
    setNotes(x=>x.map(n=>n.id===selected.id?{...n,deleted:false,updatedAt:Date.now()}:n));
    setToast('Note restored');
    setView('all');
  };

  const clearTrash=()=>{
    setNotes(x=>x.filter(n=>!n.deleted));
    setSelectedId(null);
    setToast('Trash cleared');
    setView('all');
  };

  useEffect(()=>{
    const el=bodyRef.current;
    if(!el || !selected) return;
    if(el.innerHTML !== selected.body) {
      el.innerHTML = selected.body || '';
    }
  }, [selected?.id, selected?.body]);

  const applyFormatting=(type:'bold'|'italic'|'heading'|'checklist'|'quote')=>{
    const el=bodyRef.current;
    if(!el||!selected) return;

    el.focus();

    if(type==='bold') {
      document.execCommand('bold');
      return;
    }

    if(type==='italic') {
      document.execCommand('italic');
      return;
    }

    if(type==='heading') {
      document.execCommand('formatBlock', false, 'h2');
      return;
    }

    if(type==='checklist') {
      document.execCommand('insertUnorderedList');
      return;
    }

    document.execCommand('formatBlock', false, 'blockquote');
  };

  const counts={all:notes.filter(n=>!n.archived&&!n.deleted).length,pinned:notes.filter(n=>n.pinned&&!n.deleted&&!n.archived).length,archived:notes.filter(n=>n.archived&&!n.deleted).length,trash:notes.filter(n=>n.deleted).length};
  const weekCount=notes.filter(n=>n.updatedAt>=todayStart()-6*86400000&&!n.deleted).length;
  const words=selected ? (stripHtml(selected.body).split(/\s+/).filter(Boolean).length) : 0;

  return <div className="risha-shell">
    <header className="topbar"><div className="brand"><span className="brand-dot"/>Risha</div><div className="top-actions"><button className="icon-btn" title="Toggle theme" onClick={()=>setDark(!dark)}>{dark?<Sun size={17}/>:<Moon size={17}/>}</button></div></header>
    <main className="workspace">
      <aside className="sidebar">
        <p className="side-label">Library</p>
        <nav className="nav">
          <button className={view==='all'?'active':''} onClick={()=>setView('all')}><FileText size={15}/>All notes<span className="count">{counts.all}</span></button>
          <button className={view==='pinned'?'active':''} onClick={()=>setView('pinned')}><Pin size={15}/>Pinned<span className="count">{counts.pinned}</span></button>
          <button className={view==='archived'?'active':''} onClick={()=>setView('archived')}><Archive size={15}/>Archived<span className="count">{counts.archived}</span></button>
          <button className={view==='trash'?'active':''} onClick={()=>setView('trash')}><Trash2 size={15}/>Trash<span className="count">{counts.trash}</span></button>
        </nav>
      </aside>

      <section className={'notes-panel '+(mobileView==='notes'?'mobile-open':'')}>
        <div className="notes-head">
          <div className="notes-head-row">
            <h2 className="notes-title">{view==='trash'?'Trash':view==='archived'?'Archived':view==='pinned'?'Pinned':'All notes'}</h2>
            {view==='trash' && notes.some(n=>n.deleted) ? <button className="new-btn" onClick={clearTrash}><Trash2 size={14}/>Clear</button> : <button className="new-btn" onClick={createNote}><Plus size={14}/>New</button>}
          </div>
          <div className="search"><Search size={14}/><input id="risha-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search notes..."/><span className="kbd">⌘ K</span></div>
        </div>

        <div className="note-list">
          {activeNotes.length===0 ? <div className="empty">Nothing here yet.<br/>Make a new note and start writing.</div> : activeNotes.map((n,i)=><div key={n.id}>{(i===0||formatDate(activeNotes[i-1].updatedAt)!==formatDate(n.updatedAt))&&<div className="day-label">{formatDate(n.updatedAt)}</div>}<button className={'note-row '+(selectedId===n.id?'selected':'')} onClick={()=>choose(n.id)}><div className="note-row-top"><span className="note-dot"/><span className="note-row-title">{n.title||'Untitled note'}</span>{n.pinned&&<Pin size={11}/>}<span className="note-time">{formatTime(n.updatedAt)}</span></div><p className="note-preview">{stripHtml(n.body) || 'Empty note'}</p></button></div>)}
        </div>
      </section>

      <section className={'editor '+(mobileView==='notes'?'mobile-hidden':'')}>
        {!selected ? <div className="welcome"><div className="welcome-kicker">A quiet place for thoughts</div><h1>Write it down<br/>before it <em>drifts away.</em></h1><p>Risha is a tiny, thoughtful place for ideas, plans, unfinished sentences and everything in between.</p><div className="prompt" onClick={createNote}><input readOnly placeholder="Start writing a new note..."/><button><Plus size={15}/></button></div><div className="stats"><div className="stat"><strong>{weekCount}</strong><span>Notes this week</span></div><div className="stat"><strong>{Math.max(...notes.map(n=>n.body.split(/\s+/).filter(Boolean).length),0)}</strong><span>Longest Note</span></div><div className="stat"><strong>local</strong><span>saved privately</span></div></div></div> : <>
          <div className="editor-top">
            <button className="crumb" onClick={goBackToNotes} title="Back to notes" aria-label="Back to notes"><ChevronLeft size={16}/></button>
            <div className="editor-actions">
              <button className={'small-btn '+(selected.pinned?'active':'')} title="Pin" onClick={()=>update({pinned:!selected.pinned})}><Pin size={15}/></button>
              {selected.deleted ? <button className="small-btn" title="Restore" onClick={restore}><ArchiveRestore size={16}/></button> : <button className="small-btn" title="Archive" onClick={()=>update({archived:!selected.archived})}><Archive size={15}/></button>}
              <button className="small-btn" title={selected.deleted ? 'Delete permanently' : 'Move to trash'} onClick={deleteCurrentNote}><Trash2 size={15}/></button>
            </div>
          </div>

          <div className="editor-content">
            <input id="note-title" className="note-title-input" value={selected.title} onChange={e=>update({title:e.target.value})} placeholder="Untitled note"/>
            <div className="note-meta"><span className="save-dot"/>Auto-saved locally<span>·</span><span>{words} words</span><span>·</span><span>{formatDate(selected.updatedAt)}</span></div>
            <div className="editor-body-stack">
              <div
                ref={bodyRef}
                className="note-body"
                contentEditable
                dir="ltr"
                suppressContentEditableWarning
                onInput={(e)=>{
                  const html = e.currentTarget.innerHTML;
                  update({ body: html });
                }}
                data-placeholder="Start with whatever is on your mind..."
              />
            </div>
            <div className="toolbar">
              <button className="tool" title="Bold" onClick={()=>applyFormatting('bold')}><Bold size={15}/></button>
              <button className="tool" title="Italic" onClick={()=>applyFormatting('italic')}><Italic size={15}/></button>
              <button className="tool" title="Heading" onClick={()=>applyFormatting('heading')}><Hash size={16}/></button>
              <button className="tool" title="Checklist" onClick={()=>applyFormatting('checklist')}><CheckSquare size={15}/></button>
              <button className="tool" title="Quote" onClick={()=>applyFormatting('quote')}><Quote size={15}/></button>
              <button className="tool" title="Undo" onClick={()=>document.execCommand('undo')}><Undo2 size={15}/></button>
              <button className="tool" title="Redo" onClick={()=>document.execCommand('redo')}><Redo2 size={15}/></button>
            </div>
          </div>
        </>}
      </section>
    </main>

    {toast && <div className="toast">{toast}</div>}
    <div className="mobile-bar"><button className={mobileView==='notes'?'active':''} onClick={()=>setMobileView('notes')}><BookOpen size={15}/>Notes</button><button className={mobileView==='editor'?'active':''} onClick={()=>setMobileView('editor')}><FileText size={15}/>Write</button><button onClick={createNote}><Plus size={15}/>New</button></div>
  </div>
}
