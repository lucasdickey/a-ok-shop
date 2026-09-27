/* A-OK / TRUST THE NOISE. Deterministic motion design, 1920 x 1080, 30fps. */
const {createCanvas,loadImage,GlobalFonts}=require('../.runtime/node_modules/@napi-rs/canvas');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),REPO=path.resolve(ROOT,'../..');
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial Black.ttf','Heavy');
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Impact.ttf','Condensed');
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial Bold.ttf','Sans');
GlobalFonts.registerFromPath('/System/Library/Fonts/Menlo.ttc','Mono');
const W=1920,H=1080,FPS=30,C={ink:'#101111',bone:'#f1eddf',red:'#ee302d',acid:'#d9ff5f',muted:'#a49f92'};
const can=createCanvas(W,H),g=can.getContext('2d');
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>1-Math.pow(1-clamp(t),4),smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const spring=t=>1-Math.exp(-8*clamp(t))*Math.cos(clamp(t)*8),fract=x=>x-Math.floor(x);
const rnd=n=>fract(Math.sin(n*127.1+311.7)*43758.5453);
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}
function text(s,x,y,size,c=C.bone,font='Condensed',max=1e9,align='left',outline=false){
 g.save();g.font=`${size}px "${font}"`;g.textAlign=align;g.textBaseline='top';const m=g.measureText(s).width,k=Math.min(1,max/m);g.translate(x,y);g.scale(k,1);g.fillStyle=c;g.strokeStyle=c;g.lineWidth=2;
 if(outline)g.strokeText(s,0,0);else g.fillText(s,0,0);g.restore();
}
function reveal(s,x,y,size,c,start,t,max,font='Condensed',delay=0){let u=ease((t-start-delay)/.43);g.save();g.beginPath();g.rect(x-5,y-2,max+10,size*1.16);g.clip();text(s,x,y+(1-u)*size*1.1,size,c,font,max);g.restore()}
function line(x1,y1,x2,y2,c=C.bone,width=1){g.strokeStyle=c;g.lineWidth=width;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()}
function cross(x,y,c,size=12){line(x-size,y,x+size,y,c,1.4);line(x,y-size,x,y+size,c,1.4)}
function star(x,y,r,c,angle=0){g.save();g.translate(x,y);g.rotate(angle);g.fillStyle=c;g.beginPath();for(let i=0;i<24;i++){let a=i*Math.PI/12,rr=i%2?r*.30:r;let px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?g.lineTo(px,py):g.moveTo(px,py)}g.closePath();g.fill();g.restore()}
function cover(im,x,y,w,h,z=1,px=.5,py=.5){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();let s=Math.max(w/im.width,h/im.height)*z,iw=im.width*s,ih=im.height*s;g.drawImage(im,x+(w-iw)*px,y+(h-ih)*py,iw,ih);g.restore()}
function small(s,x,y,c=C.bone,align='left'){text(s,x,y,21,c,'Mono',1000,align)}
function shell(t,section,c=C.bone){
 small('A-OK  /  APES ON KEYS',64,35,c);small('CULTURE IN THE MAKING',1856,35,c,'right');
 line(64,76,1856,76,c,1);small(section,64,1021,c);small(`${String(Math.floor(t)).padStart(2,'0')} : ${String(Math.floor(t*30)%30).padStart(2,'0')}   /   15`,1856,1021,c,'right');
 for(let i=0;i<30;i++)rect(720+i*16,1029,9,3,i<t*2?c:(c===C.ink?'#c7c2b8':'#383832'));
}
function grain(t,dark=false){g.save();g.globalAlpha=dark?.07:.055;g.fillStyle=dark?'#fff':'#000';for(let i=0;i<1400;i++){const x=rnd(i+Math.floor(t*5)*13)*W,y=rnd(i+18882)*H;g.fillRect(x,y,1.5,1.5)}g.restore()}
function ribbon(s,y,t,c,bg){rect(0,y,W,57,bg);for(let x=-600+(t*90)%680;x<W;x+=680)text(s,x,y+10,30,c,'Mono',650)}
let imgs={};
async function init(){
 const files={poster:'public/images/hp-art-grid-collection/a-ok-keyboard-inspired-by.png',glitch:'public/images/products/a-ok-glitch-art-face-mask-t-shirt-0.png',octo:'public/images/products/a-ok-octo-ape-0.png',business:'public/images/products/business-logic-crew-neck-sweatshirt-0.png'};
 for(const [k,v]of Object.entries(files))imgs[k]=await loadImage(fs.existsSync(path.join(ROOT,'assets',k+'.png'))?path.join(ROOT,'assets',k+'.png'):path.join(REPO,v));
 imgs.heroProof=await loadImage(path.join(ROOT,'renders/hero_proof.png'));
}
function intro(t){rect(0,0,W,H,C.ink);
 // The machine's scattered character field tightens into a printed headline.
 g.save();g.globalAlpha=.28*(1-smooth((t-.1)/1.2));
 const alphabet='APESONKEYS0123456789/{}<>[]';
 for(let row=0;row<10;row++)for(let col=0;col<40;col++)text(alphabet[(col*7+row*11+Math.floor(t*8))%alphabet.length],col*52-30+t*35,row*92+96,40,(row+col)%7===0?C.red:C.bone,'Mono');g.restore();
 const incoming=ease(t/.75);g.save();g.translate(1468,325);g.rotate(-.28+t*.14);g.strokeStyle=C.red;g.lineWidth=42;g.beginPath();g.ellipse(0,0,255*incoming,255*incoming,0,0,Math.PI*2);g.stroke();g.restore();
 reveal('TRUST',66,157,320,C.bone,0,t,1200);
 reveal('THE NOISE.',66,472,360,C.bone,.13,t,1788);
 const sx=mix(-450,1330,spring((t-.22)/.75));g.save();g.translate(sx,805);g.rotate(-.07);rect(0,0,490,91,C.acid);text('FIND YOUR FREQUENCY.',24,24,32,C.ink,'Sans',444);g.restore();
 line(70,917,520+980*ease((t-.55)/.85),917,C.red,8);
 shell(t,'01 / SIGNAL');grain(t,true);
}
function pattern(t){let u=t-2;rect(0,0,W,H,C.bone);
 // Registration-frame poster: real brand art, moving through three print masks.
 let x=840+110*(1-ease(u/.55)),rot=(-4+7*smooth(u/2.5))*Math.PI/180;
 g.save();g.translate(x+470,535);g.rotate(rot);rect(-474,-438,948,876,C.ink);
 let z=1+.28*smooth((u-.65)/1.65);
 for(let i=0;i<4;i++){let p=ease((u-i*.055)/.55);g.save();g.beginPath();g.rect(-460+(1-p)*990,-424+i*214,920,214);g.clip();cover(imgs.poster,-460,-424,920,856,z,.5,.39);g.restore()}
 g.restore();
 reveal('FIND',64,200,208,C.ink,2,t,720);reveal('THE',64,412,208,C.ink,2.09,t,680);reveal('PATTERN.',64,624,208,C.red,2.18,t,770);
 for(let i=0;i<6;i++)line(66+i*18,911,66+i*18,961,C.ink,i%3===0?8:3);
 small('ART / CODE / CULTURE',247,926,C.ink);
 cross(808,116,C.red);cross(1828,971,C.red);star(702,202,62,C.red,u*.75);
 shell(t,'02 / FIND THE PATTERN',C.ink);grain(t);
}
function products(t){let u=t-4.5;rect(0,0,W,H,C.red);
 reveal('WEAR THE OUTPUT.',66,133,183,C.bone,4.5,t,1790);
 const cards=[['glitch','GLITCHED VECTORS',350,-.035],['octo','OCTO MAYHEM',960,.025],['business','BUSINESS LOGIC',1570,-.03]];
 for(let i=0;i<3;i++){
  const [key,name,x,r]=cards[i],arr=spring((u-i*.11)/.66);g.save();g.translate(x+(1-arr)*(i-1)*270,655+(1-arr)*620+Math.sin(u*1.8+i)*6);g.rotate(r+Math.sin(u*1.3+i)*.012);
  g.shadowColor='rgba(20,0,0,.28)';g.shadowBlur=30;g.shadowOffsetY=16;rect(-282,-283,564,604,C.bone);g.shadowBlur=0;g.shadowOffsetY=0;
  cover(imgs[key],-268,-269,536,486,1+.055*u,.5,.43);rect(-268,218,536,85,C.ink);text(name,-246,245,32,C.bone,'Condensed',478);small(`0${i+1}`,-246,-249,C.ink);g.restore();
 }
 shell(t,'03 / STREETWEAR',C.bone);grain(t,true);
}
function object(t,hero){let u=t-7;rect(0,0,W,H,C.bone);
 // One new 3D shot: physical softboxes, real depth and a restrained orbital camera.
 let orbit=(u*.45),cx=1370,cy=558;
 g.save();g.translate(cx,cy);g.rotate(-.38);g.strokeStyle=C.red;g.lineWidth=3;g.beginPath();g.ellipse(0,0,450,365,0,0,Math.PI*2);g.stroke();g.beginPath();g.ellipse(0,0,508,401,0,.2,Math.PI*1.6);g.stroke();g.restore();
 star(1750+25*Math.cos(orbit),270+55*Math.sin(orbit),37,C.ink,orbit);
 g.save();g.globalAlpha=.12;let grd=g.createRadialGradient(1380,978,5,1380,978,300);grd.addColorStop(0,C.ink);grd.addColorStop(1,'#f1eddf00');g.fillStyle=grd;g.translate(1380,978);g.scale(1,.13);g.beginPath();g.arc(0,0,300,0,Math.PI*2);g.fill();g.restore();
 reveal('FROM',64,157,180,C.ink,7,t,800);
 reveal('SIGNAL',64,350,204,C.ink,7.13,t,820);
 reveal('TO OBJECT.',64,572,180,C.red,7.48,t,860);
 small('IMAGINATION, IN DIMENSION.',72,841,C.ink);line(72,891,642,891,C.ink,2);small('FIGURE STUDY / IN DEVELOPMENT',72,918,C.ink);
 let inx=(1-ease(u/.65))*500,sz=.90+.04*Math.sin(Math.PI*clamp(u/3.5));g.save();g.translate(1360+inx,548+5*Math.sin(u*2));g.rotate(-.02+u*.011);g.drawImage(hero,-463*sz,-540*sz,926*sz,1080*sz);g.restore();
 shell(t,'04 / FROM SIGNAL TO OBJECT',C.ink);grain(t);
}
function crescendo(t){let u=t-10.5;rect(0,0,W,H,C.ink);
 // Optical type tunnel: a single destination emerges from repeated outputs.
 g.save();g.translate(960,548);g.rotate(-.06*(1-smooth(u/2.5)));
 for(let i=5;i>=0;i--){let scale=.63+i*.17+u*.045;g.save();g.scale(scale,scale);text('A-OK',0,-280,640,i===0?C.red:'#30312c','Heavy',1580,'center',true);g.restore()}g.restore();
 let a=ease(u/.37);rect(64,147,1792*a,198,C.red);reveal('ALL OUTPUTS',88,148,203,C.bone,10.5,t,1736);
 g.save();g.translate(960,600);g.rotate(.032);rect(-765,-171,1530,294,C.bone);text('LEAD TO',0,-173,302,C.ink,'Condensed',1470,'center');g.restore();
 ribbon('APES ON KEYS   /   ALL OUTPUTS LEAD TO A-OK   /',866,u,C.ink,C.acid);
 star(1650,688,100,C.red,-u*.6);shell(t,'05 / ALL OUTPUTS');grain(t,true);
}
function end(t){let u=t-13;rect(0,0,W,H,C.ink);let enter=spring(u/.57);
 // Deliberately hold the identity after the final beat.
 g.save();g.translate(960,500);g.scale(mix(.45,1,enter),mix(1.8,1,enter));text('A-OK',0,-307,617,C.bone,'Heavy',1782,'center');g.restore();
 rect(82,768,1756*ease((u-.10)/.55),12,C.red);
 reveal('APES ON KEYS',86,801,58,C.bone,13.2,t,1050,'Sans');
 reveal('a-ok.shop',1345,792,75,C.acid,13.28,t,500,'Condensed');
 line(1810,813,1848,813,C.acid,5);line(1848,813,1848,851,C.acid,5);line(1810,851,1848,813,C.acid,5);
 small('STREETWEAR. DIGITAL CULTURE. INFINITE OUTPUTS.',86,927,C.muted);
 small('A-OK / APES ON KEYS',64,35,C.bone);small('THE FUTURE IS A-OK.',1856,35,C.bone,'right');line(64,76,1856,76,C.bone);
 grain(t,true);
}
async function frame(i,proof=false){let t=i/FPS;g.resetTransform();g.globalAlpha=1;g.clearRect(0,0,W,H);
 if(t<2)intro(t);else if(t<4.5)pattern(t);else if(t<7)products(t);else if(t<10.5){let hero=imgs.heroProof;if(!proof){hero=await loadImage(path.join(ROOT,'renders',`hero_${String(i-210+1).padStart(4,'0')}.png`))}object(t,hero)}else if(t<13)crescendo(t);else end(t);
 // Eight-frame red shutter transitions; no flashing or random strobe.
 for(const b of [2,4.5,7,10.5,13]){let d=t-b;if(d>=-.133333&&d<.133333){let q=(d+.133333)/.266666;let x=mix(-W,W,ease(q));rect(x,0,W,1080,C.red)}}
 return can;
}
async function main(){await init();if(process.argv.includes('--proof')){
 for(const [label,t]of [['01-signal',1.2],['02-pattern',3.4],['03-products',5.75],['04-object',8.9],['05-output',11.8],['06-brand',14.2]]){await frame(Math.round(t*FPS),true);fs.writeFileSync(path.join(ROOT,'renders',label+'.png'),can.toBuffer('image/png'))}console.log('STORYBOARD_READY');return;
 }
 const out=path.join(ROOT,'outputs/AOK_Trust_The_Noise_15s_Silent.mp4');const ff=spawn('/opt/homebrew/bin/ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r','30','-i','pipe:0','-an','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',out]);ff.stderr.on('data',x=>process.stderr.write(x));
 for(let i=0;i<450;i++){await frame(i);const data=can.data();if(!ff.stdin.write(data))await new Promise(r=>ff.stdin.once('drain',r));if(i%30===0)console.log('FRAME',i,'/',450)}
 ff.stdin.end();await new Promise((res,rej)=>{ff.on('close',c=>c?rej(Error('ffmpeg '+c)):res());ff.on('error',rej)});console.log('FILM_RENDER_COMPLETE',out);
}
main().catch(e=>{console.error(e);process.exit(1)});
