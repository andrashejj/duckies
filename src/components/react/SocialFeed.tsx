import { useEffect, useRef, useState } from 'react';
import type { SocialPost, SocialComment, SocialPerson } from '../../lib/server/social';
import { avatarUrl } from '../../lib/avatar';

type Props={ initialPosts:SocialPost[]; next:string|null; person:SocialPerson; author?:string; compose?:boolean; kids?:{id:string;name:string}[] };
const date=(value:string)=>new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
async function api(path:string,options:RequestInit={}){
  const response=await fetch(path,{...options,cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error??'Could not save this. Please try again.');
  return data;
}
const json=(method:string,data:unknown):RequestInit=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function Heart({filled=false}:{filled?:boolean}){return <svg viewBox="0 0 24 24" width="24" height="24" fill={filled?'currentColor':'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>}
function CommentIcon(){return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.4-4.8a9 9 0 1 1 16.6-4.7Z"/></svg>}
export function Avatar({person}:{person:SocialPerson}){const src=avatarUrl(person);return src?<img className="social-avatar" src={src} alt="" width={40} height={40}/>:<span className="social-avatar" aria-hidden="true">{person.name.slice(0,1)}</span>}
export function PersonLink({person}:{person:SocialPerson}){return <a className="social-person" href={`/members/people/${encodeURIComponent(person.id)}`}><Avatar person={person}/><span>{person.name}</span></a>}
function PostCard({initial,onRemove,onPhoto}:{initial:SocialPost;onRemove:()=>void;onPhoto:(src:string)=>void}){
  const [ready,setReady]=useState(false);
  useEffect(()=>setReady(true),[]);
  const [post,setPost]=useState(initial),[open,setOpen]=useState(false),[comments,setComments]=useState<SocialComment[]>([]),[next,setNext]=useState<string|null>(null),[body,setBody]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false);
  const endpoint=`/api/social/posts/${post.id}`;
  const refresh=async()=>{const result=await api(endpoint);setPost(result.post);setComments(result.comments);setNext(result.next);};
  async function act(action:()=>Promise<void>){setError('');setBusy(true);try{await action();}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}
  return <article className="social-post" data-post={post.id}>
    <header className="social-post-head"><div><PersonLink person={post.author}/><a className="social-post-date" href={`/members/posts/${post.id}`}><time dateTime={post.date}>{date(post.date)}</time>{!post.author.active?' · Club memories':''}</a></div>
      {post.canDelete&&<details className="social-menu"><summary aria-label="Post options">•••</summary><button disabled={busy||!ready} onClick={()=>{if(confirm(post.photoId?'Remove this post and its photo from the club?':'Remove this post from the club?'))void act(async()=>{await api(endpoint,{method:'DELETE'});onRemove();});}}>Remove post</button></details>}
    </header>
    {post.photoId&&<button className="social-post-photo" aria-label="Open post photo" onClick={()=>onPhoto(`/gallery/photo/${post.photoId}.webp`)}><img src={`/gallery/photo/${post.photoId}.webp`} alt={post.body||'A moment shared with the club'} loading="lazy"/></button>}
    <div className="social-post-content">
      {post.body&&<p className={post.photoId?'social-caption':'social-text-post'}>{post.body}</p>}
      {post.tags.length>0&&<div className="social-tags">{post.tags.map(tag=><a key={tag.id} href={`/gallery/duckies/${tag.id}`}>{tag.name}</a>)}</div>}
      <div className="social-post-actions">
        <button disabled={busy||!ready} className={post.liked?'is-liked':''} aria-label={post.liked?'Unlike post':'Like post'} aria-pressed={post.liked} onClick={()=>void act(async()=>{await api(endpoint,json('PUT',{liked:!post.liked}));await refresh();})}><Heart filled={post.liked}/><span>{post.likes||''}</span></button>
        <button aria-label="Comments" aria-expanded={open} disabled={busy||!ready} onClick={()=>void act(async()=>{if(!open)await refresh();setOpen(!open);})}><CommentIcon/><span>{post.comments||''}</span></button>
        <div className="social-share-actions">{post.canShare&&<button className="social-copy" data-public-share={`post:${post.id}`}>Share publicly</button>}
        <button disabled={!ready} className="social-copy" onClick={()=>void act(async()=>{await navigator.clipboard.writeText(`${location.origin}/members/posts/${post.id}`);setCopied(true);})}>{copied?'Link copied':'Copy club link'}</button></div>
      </div>
      {open&&<section className="social-comments" aria-label="Post comments">
        {comments.length===0&&<p className="social-muted">Start the conversation.</p>}
        {comments.map(comment=><div className="social-comment" key={comment.id}><div><a href={`/members/people/${encodeURIComponent(comment.author.id)}`}>{comment.author.name}</a><p>{comment.body}</p><time dateTime={comment.date}>{date(comment.date)}</time></div>{comment.canDelete&&<button disabled={busy||!ready} aria-label={`Remove comment by ${comment.author.name}`} onClick={()=>void act(async()=>{await api(`${endpoint}?comment=${comment.id}`,{method:'DELETE'});await refresh();})}>×</button>}</div>)}
        {next&&<button className="social-text-button" disabled={busy||!ready} onClick={()=>void act(async()=>{const more=await api(`${endpoint}?before=${next}`);setComments([...comments,...more.comments]);setNext(more.next);})}>Older comments</button>}
        <form onSubmit={event=>{event.preventDefault();void act(async()=>{await api(endpoint,json('POST',{body}));setBody('');await refresh();});}}>
          <label className="sr-only" htmlFor={`comment-${post.id}`}>Write a comment</label><input disabled={!ready} id={`comment-${post.id}`} required maxLength={1000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Add a comment…"/><button disabled={busy||!ready||!body.trim()} type="submit">Post</button>
        </form>
      </section>}
      {post.photoId&&post.canDelete&&<a className="social-photo-tags" href={`/gallery#photo-${post.photoId}`}>Manage photo tags</a>}
      {error&&<p className="social-error" role="alert">{error}</p>}
    </div>
  </article>;
}
export default function SocialFeed({initialPosts,next:initialNext,person,author,compose=false,kids=[]}:Props){
  const [ready,setReady]=useState(false);
  useEffect(()=>setReady(true),[]);
  const [posts,setPosts]=useState(initialPosts),[next,setNext]=useState(initialNext),[body,setBody]=useState(''),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[kid,setKid]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[photo,setPhoto]=useState('');
  const dialog=useRef<HTMLDialogElement>(null),fileInput=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
  async function publish(){
    setError('');setStatus('');setBusy(true);
    try{
      if(file&&!consent)throw new Error('Confirm that you have permission to share this photo.');
      if(file&&file.size>12*1024*1024)throw new Error('Choose a photo smaller than 12 MB.');
      if(file&&body.length>280)throw new Error('Photo captions can be up to 280 characters.');
      let id:string;
      if(file){
        const params=new URLSearchParams({note:body});if(kid)params.set('kid',kid);
        const result=await api(`/api/gallery/uploads?${params}`,{method:'POST',body:file,headers:{'Content-Type':file.type||'application/octet-stream'}});id=result.postId;
      }else id=(await api('/api/social/posts',json('POST',{body}))).id;
      const {post}=await api(`/api/social/posts/${id}`);setPosts([post,...posts]);setBody('');setFile(null);setConsent(false);if(fileInput.current)fileInput.current.value='';setStatus('Shared with the club.');
    }catch(e){setError(e instanceof Error?e.message:'Could not share this. Please try again.');}finally{setBusy(false);}
  }
  return <>
    {compose&&<details className="club-compose"><summary><Avatar person={person}/><span>Share a moment<span className="club-compose-hint">A photo, a small win, a note for the crew</span></span><span className="club-compose-plus" aria-hidden="true">＋</span></summary><form className="social-composer" onSubmit={event=>{event.preventDefault();void publish();}}>
      <div className="social-compose-top"><Avatar person={person}/><div><label htmlFor="post-body">Share a moment</label><p>Only inside the club</p></div></div>
      <textarea disabled={!ready} id="post-body" aria-label="Your post" placeholder="Good waves? A first stand-up? Tell the crew…" maxLength={file?280:2000} value={body} onChange={e=>setBody(e.target.value)} rows={3}/>
      {preview&&<div className="social-preview"><img src={preview} alt="Photo to share"/><button type="button" onClick={()=>{setFile(null);if(fileInput.current)fileInput.current.value='';}}>Remove photo</button></div>}
      {file&&<><div className="social-tag-select"><label htmlFor="post-kid">Tag a duckie</label><select id="post-kid" value={kid} onChange={e=>setKid(e.target.value)}><option value="">No tag</option>{kids.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</select></div><label className="social-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I have permission to share this photo with the club.</label></>}
      <div className="social-compose-actions"><label className="social-text-button" htmlFor="post-photo">＋ Photo<input ref={fileInput} id="post-photo" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={e=>{setFile(e.target.files?.[0]??null);setConsent(false);}}/></label><span>{body.length}/{file?280:2000}</span><button className="journal-button journal-button-primary" disabled={busy||(!body.trim()&&!file)}>{busy?'Sharing…':'Share'}</button></div>
    </form></details>}
    {error&&<p className="social-error" role="alert">{error}</p>}{status&&<p className="social-muted" role="status">{status}</p>}
    <div className="social-posts">{posts.map(post=><PostCard key={post.id} initial={post} onRemove={()=>setPosts(posts.filter(p=>p.id!==post.id))} onPhoto={src=>{setPhoto(src);dialog.current?.showModal();}}/>)}</div>
    {posts.length===0&&<div className="journal-empty"><h2>A little quiet here</h2><p>{compose?'Share a photo, a small win, or a note for the crew.':'Shared moments will appear here.'}</p></div>}
    {next&&<button className="journal-button social-load" disabled={busy||!ready} onClick={async()=>{setBusy(true);setError('');try{const params=new URLSearchParams({before:next});if(author)params.set('author',author);const more=await api(`/api/social/posts?${params}`);setPosts([...posts,...more.posts]);setNext(more.next);}catch(e){setError(e instanceof Error?e.message:'Could not load more.');}finally{setBusy(false);}}}>More moments</button>}
    <dialog ref={dialog} className="social-lightbox" aria-label="Post photo" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}><button aria-label="Close photo" onClick={()=>dialog.current?.close()}>×</button><img src={photo||undefined} alt="Shared club photo"/></dialog>
  </>;
}
