import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
// A faithful interpreter of make.fun's tiny stack ISA (kit: generator/subject/ISA.md, vm.mjs):
// 32-bit wrapping arithmetic, 256-value stack, 64-deep call stack, 256 words of memory,
// input/output, all ten traps with their own exit codes, the 1,000,000-step and 65,536-byte
// output limits. Practice score 1,000,000 (max); house baseline plain-vm 1.0.0 scores 670,000.
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
// Opcode tables from the reference VM's OPS (imm, pops, pushes per opcode 0x00-0x53; '9' = no such opcode).
const IM='014000000000000000000000000000000000000000000000222200000000000000000000000000000000';
const PO='000112239999999922222221222122292229999999999999011009999999999912999999999999991101';
const PU='011022330000000011111111111111101110000000000000000000000000000010000000000000000010';
function run(p:Uint8Array,q:Uint8Array):[Uint8Array,number]{
 const D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),o=new Uint8Array(65536);
 let s=0,c=0,l=0,g=0,pc=0,t=0;const n=p.length;
 const d=(e:number):[Uint8Array,number]=>[o.slice(0,l),e];
 for(;;){
  if(t===1e6)return d(10);
  if(pc<0||pc>=n)return d(9);
  const op=p[pc],po=+PO[op];
  if(op>83||po>8)return d(5);
  const im=+IM[op],pu=+PU[op];
  if(pc+im>=n)return d(9);
  t++;
  if(s<po)return d(2);
  if(s-po+pu>256)return d(3);
  const x=pc+1+im;pc=x;
  if(op>15&&op<35&&op!==23&&op!==27){
   const b=D[s-1],a=D[s-2];let r=0;
   if(op===16)r=a+b|0;else if(op===17)r=a-b|0;else if(op===18)r=Math.imul(a,b);
   else if(op===19){if(!b)return d(4);r=a===-2147483648&&b===-1?a:(a/b)|0}
   else if(op===20){if(!b)return d(4);r=b===-1?0:a%b|0}
   else if(op===21){if(!b)return d(4);r=Math.floor((a>>>0)/(b>>>0))|0}
   else if(op===22){if(!b)return d(4);r=(a>>>0)%(b>>>0)|0}
   else if(op===24)r=a&b;else if(op===25)r=a|b;else if(op===26)r=a^b;
   else if(op===28)r=a<<(b&31);else if(op===29)r=a>>(b&31);else if(op===30)r=a>>>(b&31)|0;
   else if(op===32)r=a===b?1:0;else if(op===33)r=a<b?1:0;else r=(a>>>0)<(b>>>0)?1:0;
   s-=2;D[s++]=r;continue;
  }
  switch(op){
   case 0:return d(0);
   case 1:D[s++]=p[x-1]<<24>>24;break;
   case 2:D[s++]=p[x-4]|p[x-3]<<8|p[x-2]<<16|p[x-1]<<24;break;
   case 3:s--;break;
   case 4:D[s]=D[s-1];s++;break;
   case 5:{const v=D[s-1];D[s-1]=D[s-2];D[s-2]=v;break}
   case 6:D[s]=D[s-2];s++;break;
   case 7:{const v=D[s-3];D[s-3]=D[s-2];D[s-2]=D[s-1];D[s-1]=v;break}
   case 23:D[s-1]=-D[s-1]|0;break;
   case 27:D[s-1]=~D[s-1];break;
   case 48:case 49:case 50:{
    const r=((p[x-2]|p[x-1]<<8)<<16)>>16;
    if(op===48||(op===49)===(D[--s]===0))pc=x+r;
    break}
   case 51:if(c===64)return d(7);C[c++]=x;pc=p[x-2]|p[x-1]<<8;break;
   case 52:if(!c)return d(8);pc=C[--c];break;
   case 64:{const a=D[s-1];if(a<0||a>255)return d(6);D[s-1]=M[a];break}
   case 65:{const a=D[s-1],v=D[s-2];if(a<0||a>255)return d(6);s-=2;M[a]=v;break}
   case 80:{const v=String(D[s-1]);if(l+v.length>65536)return d(11);s--;for(let i=0;i<v.length;i++)o[l++]=v.charCodeAt(i);break}
   case 81:if(l+1>65536)return d(11);o[l++]=D[--s]&255;break;
   case 82:D[s++]=g<q.length?q[g++]:-1;break;
   case 83:return d(D[--s]&255);
  }
 }
}
for(const id of readdirSync(I).sort()){
 const r=run(new Uint8Array(readFileSync(join(I,id,'program.bin'))),new Uint8Array(readFileSync(join(I,id,'input.bin'))));
 mkdirSync(join(O,id),{recursive:true});
 writeFileSync(join(O,id,'stdout.bin'),r[0]);
 writeFileSync(join(O,id,'exit.txt'),r[1]+'\n');
}
