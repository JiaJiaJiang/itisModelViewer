function enableMouseDrag(){
	let dragging=null,dragged=false;
	window.addEventListener('mousedown',function(e){
		if(e.target.getAttribute('mousedragevent')!=='true')return;
		dragged=false;
		dragging=e.target;
	});
	window.addEventListener('mousemove',function(e){
		if(!dragging)return;
		if(!dragged){dragged=true;return;}
		e.preventDefault();
		/* e.movementX/=devicePixelRatio;
		e.movementY/=devicePixelRatio; */
		var event=new MouseEvent('mousedrag',e);
		dragging.dispatchEvent(event);
	});
	window.addEventListener('mouseup',function(e){
		dragged=false;
		dragging=null;
	});
}
function addEvents(target,events){
	if(!Array.isArray(target))target=[target];
	target.forEach(function(t){
		for(let e in events)
			t.addEventListener(e,events[e],true);
	});
}

function assignOptions(to,from,...ext){
	for(let n in from){
		if(from[n]===undefined)continue;
		to[n]=from[n];
	}
	if(ext.length){
		assignOptions(to,...ext);
	}
	return to;
}
export {enableMouseDrag,addEvents,assignOptions};