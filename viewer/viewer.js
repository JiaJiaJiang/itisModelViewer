/* 
itisModelViewer
copyright luojia@luojia.me
*/
//operate hash arguments
const pageArgs=new class PageArgs{
	constructor(){
		this.args={};
		[...new Set(location.hash.replace(/^\#/,'')
		.split('&'))].filter(e=>e&&e.trim())
		.map(a=>{
			var p=a.split('=');
			this.args[decodeURIComponent(p.shift())]=p.length>0?decodeURIComponent(p.join('=')):undefined;
		});
	}
	has(name){return name in this.args;}
	remove(name,update=false){delete this.args[name];update&&this.toString(true);return this;}
	get(name){return this.args[name];}
	set(name,value,update=false){this.args[name]=value;update&&this.toString(true);return this;}
	toString(updateHash){
		let hash=[];
		[...Object.entries(this.args)].map(e=>{
			hash.push(`${encodeURIComponent(e[0])}${e[1]===undefined?'':'='+encodeURIComponent(e[1])}`);
		});
		hash=hash.join('&');
		if(updateHash)location.hash=hash;
		return hash;
	}
}
//init the viewer
const viewer=new itisModelViewer(
	pageArgs.get('url'),//url of the model
	{
		gridHelper:(pageArgs.has('gridHelper')),//show a grid helper at zero point
		wireframe:(pageArgs.has('wireframe')),//show all materials as wireframe
		noAnimation:(pageArgs.has('noAnimation')),//do not play animations in the loaded file
		shadow:(pageArgs.has('shadow')),//show shadow of the models. If turn on, only default lights will be visabled because it's hard to set all lights correctly
		meshDebug:(pageArgs.has('meshDebug')),//shou mesh as wireframe while mouse moves over it
		defocus:(pageArgs.has('defocus')),//turn on defocus effect
		highQuality:(pageArgs.has('highQuality')),//force high quality
		cameraPos:pageArgs.has('campos')?pageArgs.get('campos').replace(/\w+/g,t=>parseInt(t,36)).split(',').map(p=>Number(p)):undefined,//camera position and target position,numbers' int part are base32 encoded
		/* 
		set background color, it cannot be loaded from a model file so you can set it manually.
		if rendererOpts.alpha exists, this option will not take effect
		supported color: https://threejs.org/docs/#api/math/Color
		*/
		bgColor:pageArgs.get('bgColor'),
		rendererOpts:{
			precision:pageArgs.get('precision'),//precision of shaders:lowp,mediump,highp
			antialias:!pageArgs.has('antialiasOff'),//have this opt to turn off antialias
			alpha:pageArgs.has('alpha'),//set the background transparent
		}
	}
);


/* ====loading==== */
//hide loading animation if no url
if(!pageArgs.has('url')){
	loading_dom.style.display='none';
}
//hide loading animation after loaded
viewer.once('fileLoaded',()=>{loading_dom.style.display='none';viewer.refresh();})
.once('fileLoadingError',err=>{
	progress_dom.innerHTML='Error';
});
//show progress in the loading info
viewer.on('fileLoadingProgress',(loaded,total)=>{
	if(!total){//for some reason there may be no total number,such as multi files or server not supported
		//show a random animation
		progress_dom.innerHTML=`Loading<br>${convSize(loaded)}`;
		loading_dom.style.backgroundColor=`rgba(0,0,0,${Math.round((Math.random()*0.5+0.5)*100)/100})`;
	}else{
		//show progress animation
		progress_dom.innerHTML=`Loading<br>${convSize(loaded)}/${convSize(total)}`;
		loading_dom.style.backgroundColor=`rgba(0,0,0,${1-loaded/total})`;
	}
}).on('itemLoaded',(url,loaded,total)=>{//for multi file loaders, show loaded items instead of file size
	progress_dom.innerHTML=`Loading<br>${loaded}/${total}`;
	loading_dom.style.backgroundColor=`rgba(0,0,0,${1-loaded/total})`;
});
//reset canvas size
function fullFillCanvas(){viewer.resize(window.innerWidth,window.innerHeight);}
window.addEventListener('resize',e=>fullFillCanvas());
fullFillCanvas();

/* ====events==== */
//update camera position in url hash
let camposUpdated=false;
viewer.controls.addEventListener('end',()=>{
	if(camposUpdated)return;//still animating
	camposUpdated=true;
	let pos=viewer.camera.position,target=viewer.controls.target;
	let campos=`${pos.x},${pos.y},${pos.z},${target.x},${target.y},${target.z}`.replace(/\d+/g,t=>Number(t).toString(36));//convert evert int part to base32
	pageArgs.set('campos',campos,true);
});
viewer.controls.addEventListener('change',e=>camposUpdated=false);

/* ====utils==== */
//convert bytes to human readable format
function convSize(byte){
	let units=['B','KB','MB','GB'],i=Math.min((byte.toString().length-1)/3|0,3);
	return (byte/(1000**i)).toFixed(2)+(units[i]||'GB');
}


/* ====for debug==== */
const THREE=itisModelViewer.THREE;
function animationLoop() {//donot use it unless debug
	requestAnimationFrame(animationLoop);
	viewer.refresh();
}
viewer.renderer.domElement.addEventListener('click',e=>{
	console.debug(viewer.objectsAtPixel(e.offsetX, e.offsetY));
});

// animationLoop();
const PPe=viewer.postprocessing.effectController;
/* let d=0;
viewer.on('beforeRefresh',e=>{
	PPe.gain=d+=0.001;
});
setInterval(()=>{
	console.log(PPe.gain)
},1000) */