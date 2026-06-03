/**
 * Author: Ricard Santiago Raigada García
 */
import { drawBox, isoLabel, sp, cam } from './isometric.js'
const ORIGIN = { wx: -12, wy: -7 }

export function drawHPC(ctx, job, fragments, T, getFragState) {
  const {wx:bx,wy:by} = ORIGIN
  const rackMap = new Map()
  drawBox(ctx,bx-1,by-1,0,13,9,0.3,'#c6c6c6','#e0e0e0','rgba(22,22,22,0.55)')
  const ct=sp(bx+5.5,by-0.5,0.9)
  pill(ctx,ct.x+90,ct.y,'CESGA HPC CLUSTER','#ffffff','#0f62fe','#0043ce',9.5)

  const execMap=new Map(), dispMap=new Map()
  fragments.forEach(f=>{
    if(f.rank==null) return
    const st=getFragState(f,T)
    if(st==='exec_hpc'||st==='exec_retry') execMap.set(f.rank,f)
    else if(st==='in_queue_hpc') dispMap.set(f.rank,f)
  })

  job.nodes.forEach((node,nodeIdx)=>{
    const nx=bx+nodeIdx*6.5
    const nt=sp(nx+2.2,by+0.5,0.85)
    pill(ctx,nt.x,nt.y,`${node.name}  r${node.ranks[0]}-${node.ranks[node.ranks.length-1]}`,
      '#161616','#ffffff','rgba(15,98,254,0.55)',8.5)

    node.ranks.forEach((rank,rIdx)=>{
      const col=rIdx%2, row=Math.floor(rIdx/2)
      const rx=nx+col*2.2, ry=by+row*2.5+1.5, rz=0.3
      const isExec=execMap.has(rank), isDisp=dispMap.has(rank)

      const faceC=isExec?'#0f62fe':isDisp?'#a6c8ff':'#dcdcdc'
      const topC =isExec?'#4589ff':isDisp?'#d0e2ff':'#f4f4f4'
      const edgeC=isExec?'#0043ce':isDisp?'#0f62fe':'rgba(22,22,22,0.40)'
      drawBox(ctx,rx,ry,rz,1.5,1.9,2.8,faceC,topC,edgeC)

      if(isExec){
        const led=sp(rx+0.75,ry+0.15,rz+2.9)
        const pulse=0.55+0.40*Math.sin(Date.now()/220+rank)
        ctx.beginPath();ctx.arc(led.x,led.y,Math.max(1.8,4*cam.z),0,Math.PI*2)
        ctx.fillStyle=`rgba(0,67,206,${pulse})`;ctx.fill()
        const frag=execMap.get(rank)
        isoLabel(ctx,rx+0.75,ry+0.95,rz+3.05,frag.id.slice(-3),'#ffffff',8)
      } else if(isDisp){
        const led=sp(rx+0.75,ry+0.15,rz+2.9)
        const pulse=0.20+0.20*Math.sin(Date.now()/900+rank)
        ctx.beginPath();ctx.arc(led.x,led.y,Math.max(1.2,2.4*cam.z),0,Math.PI*2)
        ctx.fillStyle=`rgba(15,98,254,${0.4+pulse})`;ctx.fill()
        const frag=dispMap.get(rank)
        isoLabel(ctx,rx+0.75,ry+0.95,rz+3.05,frag.id.slice(-3),'#0043ce',7)
      } else {
        isoLabel(ctx,rx+0.75,ry+0.95,rz+3.05,`r${rank}`,'#525252',7)
      }
      rackMap.set(rank,sp(rx+0.75,ry+0.95,rz+2.8))
    })
  })
  return rackMap
}

function pill(ctx,x,y,text,textCol,bgCol,borderCol,size){
  const fs=Math.max(8,size*cam.z)
  ctx.font=`600 ${fs}px 'IBM Plex Mono','Courier New',monospace`
  const tw=ctx.measureText(text).width, px=9, py=4
  ctx.fillStyle=bgCol; rr(ctx,x-tw/2-px,y-fs-py+2,tw+px*2,fs+py*2,2); ctx.fill()
  ctx.strokeStyle=borderCol;ctx.lineWidth=0.7;ctx.stroke()
  ctx.fillStyle=textCol;ctx.textAlign='center';ctx.fillText(text,x,y);ctx.textAlign='left'
}
function rr(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath()
}
export function hpcCableAnchors(){
  const {wx:bx,wy:by}=ORIGIN
  return [{wx:bx+2.5,wy:by+4.0,wz:0.3},{wx:bx+9.0,wy:by+4.0,wz:0.3}]
}
