function rmEmptyDup(arr){
	return  [...new Set(arr)].filter(e=>e&&e.trim());
}
function setPageArg(name,value){
	if(value == undefined){
		delete pageArgs[name];
		return;
	}
	pageArgs[name]=encodeURIComponent(value);
	var l=[];
	for(a in pageArgs){
		l.push(`${a}=${pageArgs[a]}`);
	}
	location.hash=l.join('&');
}
var pageArgs={};
rmEmptyDup(location.hash.replace(/^\#/,'').split('&')).map(a=>{
	var p=a.split('=');
	if(p.length){
		pageArgs[p.shift()]=decodeURIComponent(p.join('='));
	}
});
if(!pageArgs.url){//hide loading animation if no url
	loading_dom.style.display='none';
}
const viewer=new itisModelViewer(
	pageArgs.url//url of the model
	,{
		gridHelper:('gridHelper' in pageArgs),//show a grid helper at zero point
		wireframe:('wireframe' in pageArgs),//show all materials as wireframe
		noAnimation:('noAnimation' in pageArgs),//do not play animations in the loaded file
		shadow:('shadow' in pageArgs),//show shadow of the models. If turn on, only default lights will be visabled because it's hard to set all lights correctly
		meshDebug:('meshDebug' in pageArgs),//shou mesh as wireframe while mouse moves over it
		defocus:('defocus' in pageArgs),//turn on defocus effect
		//set background color, it cannot be loaded from a model file so you can set it manually.
		//if rendererOpts.alpha exists, this option will not take effect
		//supported color: https://threejs.org/docs/#api/math/Color
		bgColor:pageArgs.bgColor,
		
		rendererOpts:{
			precision:pageArgs.precision,//precision of shaders:lowp,mediump,highp
			antialias:!('antialiasOff' in pageArgs),//have this opt to turn off antialias
			alpha:('alpha' in pageArgs),//set the background transparent
		}
	});
const THREE=itisModelViewer.THREE;
viewer.once('fileLoaded',()=>{loading_dom.style.display='none';viewer.refresh();})
.once('fileLoadingError',err=>{
	progress_dom.innerHTML='Error';
});
viewer.on('fileLoadingProgress',(loaded,total)=>{
	if(!total){
		progress_dom.innerHTML=`Loading<br>${convSize(loaded)}`;
		loading_dom.style.backgroundColor=`rgba(0,0,0,${Math.round((Math.random()*0.5+0.5)*100)/100})`;
	}else{
		progress_dom.innerHTML=`Loading<br>${convSize(loaded)}/${convSize(total)}`;
		loading_dom.style.backgroundColor=`rgba(0,0,0,${1-loaded/total})`;
	}
});
viewer.renderer.domElement.addEventListener('click',e=>{
	console.log(viewer.objectsAt(e.offsetX, e.offsetY));
});
function convSize(byte){
	let unit='B';
	if(byte<1000){}
	else if(byte<1000**2){byte/=1000;unit='KB';}
	else if(byte<1000**3){byte/=1000**2;unit='MB';}
	else if(byte<1000**4){byte/=1000**3;unit='GB';}
	byte=byte.toFixed(2)+unit;
	return byte;
}
function fullFillCanvas(){viewer.resize(window.innerWidth,window.innerHeight);}
fullFillCanvas();
window.addEventListener('resize',e=>fullFillCanvas());
function animate() {//donot use it unless debug
	requestAnimationFrame(animate);
	viewer.refresh();
}
