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
	pageArgs.url
	// null
	// './just_a_girl/scene.gltf'
	// './3.fbx'
	// './3.glb'
	// './4.glb'
	,{});
// const THREE=itisModelViewer.THREE;
viewer.once('fileLoaded',()=>{loading_dom.style.display='none';});
viewer.on('fileLoadingProgress',(loaded,total)=>{
	if(!total){
		progress_dom.innerHTML=convSize(loaded);
		loading_dom.style.backgroundColor=`rgba(0,0,0,${Math.round((Math.random()*0.5+0.5)*100)/100})`;
	}else{
		progress_dom.innerHTML=`${convSize(loaded)}/${convSize(total)}`;
		loading_dom.style.backgroundColor=`rgba(0,0,0,${1-loaded/total})`;
	}
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
function animate() {
	requestAnimationFrame(animate);
	viewer.refresh();
}
animate();
