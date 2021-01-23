const THREE=require('three');
const NodeUrl = require('url');
// import { GLTFLoader } from 'three/examples/js/loaders/GLTFLoader.js';
const { DRACOLoader }=require('three/examples/jsm/loaders/DRACOLoader.js');
const { GLTFLoader }=require('three/examples/jsm/loaders/GLTFLoader.js');
const { OrbitControls }=require('three/examples/jsm/controls/OrbitControls.js');
const { FBXLoader } =require('three/examples/jsm/loaders/FBXLoader.js');

import {addEvents} from './eventUtils.js';
const EventEmitter = require('events');
class itisModelViewer extends EventEmitter{
	_vars(){
		this.opts=null;//save the options
		this.renderer=null;
		this.clock=new THREE.Clock();//clock for animation
		this.animationMixer=null;
		this.defaultCamera=null;//for view of scene's transform
		this.defaultScene=null;//loaded when no url specified
		this.defaultLights=[];
		this.loadedScene=null;//loaded scene from fils
		this.currentCamera=null;//current using camera
		// this.currentScene=null;//current using scene
		this.controls=null;
		this.cameras=[];
		this._maxDistanceToCenter=0;
		this._center=THREE.Vector3;
		this.lastInteractive=0;
		this.animatingTime=100;
		this.boundingBox={min:new THREE.Vector3,max:new THREE.Vector3};
		// this.frameCalls=[];
	}
	get width(){return this.opts.width;}
	// set width(v){this.opts.width=v;}
	get height(){return this.opts.height;}
	// set height(v){this.opts.height=v;}
	get camera(){return this.currentCamera;}
	get scene(){return this.defaultScene;}
	get animating(){return (Date.now()-this.lastInteractive<this.animatingTime)||(this.animationMixer.timeScale!==0&&this.loadedScene.actions?.length!==0);}
	constructor(url,opts){
		super();
		this._vars();
		this.opts=opts=Object.assign({
			canvas:undefined,
			width:0,
			height:0,
			parent:document.body,
			rendererOpts:undefined,
			focusOnObject:true,//move the object to center
		},opts);
		
		opts.width||(opts.width=opts.canvas?.width||300);
		opts.height||(opts.height=opts.canvas?.height||300);

		this.initRenderer();
		this.initDefaultCamera();
		if(url){
			this.loadFile(url);
		}
		this.initControls();
		// this.initAnimationMixer();
		this.initDefaultScene();
	}
	initRenderer(){
		const opts=this.opts;
		/* create a renderer */
		const defaultRendererOpts={
			canvas:opts.canvas,
			antialias:true,
			alpha:false,
			precision:'highp',
			logarithmicDepthBuffer:true,
		};
		const rendererOpts=Object.assign({},defaultRendererOpts,opts.rendererOpts);
		const renderer=this.renderer = new THREE.WebGLRenderer(rendererOpts);
		renderer.setSize(this.width,this.height);
		renderer.setClearColor(new THREE.Color( "rgb(20,20,20)"));
		renderer.setPixelRatio(devicePixelRatio);
		renderer.sortObjects=false;
		renderer.physicallyCorrectLights=true;
		/* renderer.shadowMap.enabled=true;
		renderer.shadowMap.autoUpdate=true; */

		if(!opts.canvas){
			opts.parent.appendChild(renderer.domElement);
		}
	}
	initDefaultScene(/* createDefaultObject=true */){
		const opts=this.opts;
		/* create default scene */
		const scene=this.defaultScene = new THREE.Scene();
		/* create a light */
		const lightA = new THREE.AmbientLight( 0x404040 ); // soft white light
		lightA.intensity=8;
		this.scene.add(lightA);
		this.defaultLight.push(lightA);
		const lightD = new THREE.DirectionalLight( 0xffffff, 0.8 );
		lightD.castShadow=true;
		lightD.position.set(1,1,1);
		scene.add(lightD);
		this.defaultLight.push(lightD);

		/* const light = new THREE.DirectionalLight( 0xffffff, 0 );
		light.name='default_light';
		light.castShadow=true;
		light.position.set(0,0,0);
		this.defaultCamera.add(light); */
		/* const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff,200 );
				hemiLight.color.setHSL( 0.6, 1, 0.6 );
				hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
				hemiLight.position.set( 0, 50, 0 );
				this.scene.add( hemiLight ); */

		/* create a cube */
		const cube = new THREE.Mesh( new THREE.BoxGeometry(), new THREE.MeshPhongMaterial( { color: 0x66ccff } ) );
		this.defaultScene.add( cube );
		this.once('fileLoaded',()=>{
			cube.geometry.dispose();
			cube.material.dispose();
			this.defaultScene.remove( cube );
			this.removeListener('beforeRefresh', rotateCube);
		});
		function rotateCube(){
			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;
		}
		this.on('beforeRefresh',rotateCube);
		// this.scene.add(this.defaultCamera);
		this.setCamera(this.defaultCamera);
		// this.setScene(scene);
	}
	initControls(){
		this._setMouseEvents();
		const controls =this.controls= new OrbitControls(this.camera, this.renderer.domElement );
		controls.dampingFactor=0.02;
		controls.enableDamping=true;
		// controls.enableZoom=false;
		controls.mouseButtons = {
			LEFT: THREE.MOUSE.ROTATE,
			MIDDLE: THREE.MOUSE.PAN,
			// RIGHT: THREE.MOUSE.RIGHT,
		};
		controls.zoomSpeed=0.4;
		controls.saveState();
		controls.addEventListener('change',e=>{
			if(!this.animating)
				requestAnimationFrame(()=>this.refresh(true));
			this.lastInteractive=Date.now();
		});
		controls.addEventListener('start',e=>{
			// if(!this.animating)
			// requestAnimationFrame(()=>{viewer.refresh();});
			// this.refresh();
		});
		this.on('beforeRefresh',e=>{
			controls.update();
		});
	}
	initDefaultCamera(){
		/* create a default camera */
		const camera=this.defaultCamera = new THREE.PerspectiveCamera( 75,this.width / this.height, 0.001, 1000 );
		camera.position.set(0,0.5,5);
		camera.lookAt(0,0,0);
		camera.far=10000000000;
		this.currentCamera=this.defaultCamera;
	}
	initAnimationMixer(scene){
		const opts=this.opts;
		if(this.animationMixer){//clear animationMixer
			this.animationMixer.stopAllAction();
			this.animationMixer.uncacheClip();
			this.animationMixer.uncacheRoot();
			this.animationMixer.uncacheAction();
		}
		/* mixers */
		this.animationMixer=new THREE.AnimationMixer(scene);
		scene.actions=[];
	}
	actionsToggle(enabled){

	}
	resize(width,height){
		if(this.camera){
			this.camera.aspect=width/height;
			this.camera.updateProjectionMatrix();
		}
		this.opts.width=width;
		this.opts.height=height;
		this.renderer.setSize(width,height,true);
	}
	_setMouseEvents(){
		addEvents(this.renderer.domElement,{
			/* 'wheel':e=>{//scale
				const S=this.scene;
				let s=S.scale.x*(1-e.deltaY/1000);
				if(s<0.01)s=0.01;
				else if(s>1000)s=1000;
				S.scale.set(s,s,s);
			}, */
			'contextmenu':e=>{this.resetView();e.preventDefault()},
		});
	}
	resetView(){
		this.controls.reset();
		//change scale of the scene to fit screen
		let scale=this.getFitScale(),center=this._center;
		if(!this.loadedScene)return;
		this.scene.scale.set(scale,scale,scale);
		if(this.opts.focusOnObject){
			// let sceneMax=this.boundingBox.max;
			/* this.defaultCamera.position.set(0,sceneMax.y*0.5,sceneMax.z*3);
			this.defaultCamera.lookAt(center.x,center.y,center.z);
			this.setCamera(null); */
			this.loadedScene.position.set(-center.x,-center.y,-center.z);
		}else{
			this.loadedScene.position.set(0,0,0);
		}
		/* const S=this.scene;
		let scale=this.getFitScale();
		S.scale.set(scale,scale,scale); */
		/* this.setCamera(this.defaultCamera);
		this.camera.position.set(0,1,5);
		this.camera.lookAt(0,0,0); */
	}
	getFitScale(){
		return 4/(this._maxDistanceToCenter||4);
	}
	loadFile(fileurl){
		const url=NodeUrl.parse(fileurl);
		let loader;
		if(url.pathname.match(/.gl(b|tf)$/i)){
			loader = new GLTFLoader();
			const dracoLoader = new DRACOLoader();
			dracoLoader.setDecoderPath( '../lib/draco/' );
			loader.setDRACOLoader(dracoLoader);
		}else if(url.pathname.match(/.fbx$/i)){
			loader = new FBXLoader();
		}else{
			throw(new Error('format not supported'));
		}
		loader.load(fileurl,result=>{
			console.log('file loaded',result);
			let scene;
			if(result instanceof THREE.Object3D){//the result may be a n object3d or a scene depends on the loader
				scene=result;
			}else if(result.scene instanceof THREE.Object3D){
				scene=result.scene;
				scene.animations=result.animations;
			}else{
				throw(new Error('not supported model'));
			}
			//traverseVisible
			scene.traverse(child=>{
				if(child instanceof THREE.Light){
					if(this.renderer.physicallyCorrectLights){
						/* if('power' in child)
							child.power*=child.intensity; */
						if('decay' in child)
							child.decay=1;
						// child.intensity*=100;
					}
					child.castShadow=true;
				}
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});
			/* convert lights 
				light's intensity clamp between 0-1 here */
			/* this.processObjects(scene,o=>o instanceof THREE.Light,light=>{
				if(light instanceof THREE.DirectionalLight){
					// light.intensity/=10;
				}else{
					light.intensity/=10;
				}
			}); */
			this.setScene(scene);
			this.emit('fileLoaded');
		},xhr=>{
			this.emit('fileLoadingProgress',xhr.loaded,xhr.total);
			// console.log(xhr.loaded, ' loaded' );
		},error=>{
			this.emit('fileLoadingError',error);
			console.error( error );
		});
	}
	setCamera(target,findCameraOnly=true){
		if(target===null){
			this.defaultCamera.parent=null;
			this.setCamera(this.defaultCamera);
			return;
		}else if(typeof target=='string' || target instanceof RegExp){
			let found=this.findTarget(target,findCameraOnly?THREE.Camera:null);
			if(found){
				this.setCamera(found);
				return found;
			}
			return;
		}else if(target instanceof THREE.Camera){
			if('aspect' in target)target.aspect=this.width/this.height;
			target.updateProjectionMatrix&&target.updateProjectionMatrix();
			this.controls.enabled=(this.defaultCamera===target);
			this.currentCamera=target;
		}else if(target instanceof THREE.Object3D){
			target.add(this.defaultCamera);
			this.setCamera(this.defaultCamera);
			// this.currentCamera=this.defaultCamera;
		}
	}
	setScene(scene){
		if(scene===this.scene){
			throw(new Error('cannot add scene to it self'));
		}
		if(scene instanceof THREE.Object3D){
			let hasLight=false;
			// let points=[];
			this.cameras.length=0;
			let sceneMin=this.boundingBox.min,sceneMax=this.boundingBox.max;
			sceneMin.set(0,0,0);
			sceneMax.set(0,0,0);
			function checkBoundingPoint(x,y,z,min,max){
				if(min.x>x)min.x=x;
				if(min.y>y)min.y=y;
				if(min.z>z)min.z=z;
				if(max.x<x)max.x=x;
				if(max.y<y)max.y=y;
				if(max.z<z)max.z=z;
			}
			//find center of the model and check if a default light is needed
			let basePosition=new THREE.Vector3,
					baseScale=new THREE.Vector3,
					baseQuaternion=new THREE.Quaternion;
			scene.traverse(child=>{
				if(child instanceof THREE.Camera)this.cameras.push(child);//get a camera list from the scene
				else if(child instanceof THREE.Light)hasLight=true;//check if there are lights
				else if (child.isMesh&&child.geometry) {
					/* if(!child.geometry.boundingBox)
						console.log(child.geometry.computeBoundingBox());
					let {min,max}=child.geometry.boundingBox; */
					let min=new THREE.Vector3,max=new THREE.Vector3;
					/* console.log(child)*/
					let arr=child.geometry.attributes.position.array;//[x,y,z...]
					if(arr){
						let count=child.geometry.attributes.position.count;
						if(count<2)return;
						for(let i=0;i<count;i++){
							checkBoundingPoint(arr[i*3],arr[i*3+1],arr[i*3+2],min,max);
						}
					}else if(child.geometry.vertices){//[Vector3...]
						return;
						for(let v of child.geometry.vertices){
							checkBoundingPoint(v.x,v.y,v.z,min,max);
						}
					}else{
						return;
					}
					child.getWorldPosition(basePosition),
					child.getWorldScale(baseScale),
					child.getWorldQuaternion(baseQuaternion);
					min.applyQuaternion(baseQuaternion).multiply(baseScale).add(basePosition);
					max.applyQuaternion(baseQuaternion).multiply(baseScale).add(basePosition);
					checkBoundingPoint(min.x,min.y,min.z,sceneMin,sceneMax);
					checkBoundingPoint(max.x,max.y,max.z,sceneMin,sceneMax);
				}
			});
			for(let l of this.defaultLights){//show default lights if there is no light in the scene
				l.visible=!hasLight;
			}
			let points=[sceneMin,sceneMax];
			let center=this._center=itisModelViewer.calcCenter(points);
			console.log('center',center)
			//find the farthest point from the center to get a scale
			let farthest=0;
			for(let p of points){
				let dis=center.distanceTo(p);
				if(dis>farthest)farthest=dis;
			}
			this._maxDistanceToCenter=farthest;
			let fitScale=this.getFitScale();
			/* if(this.renderer.physicallyCorrectLights){//apply scale on lights
				scene.traverse(child=>{
					if('intensity' in child){
						child.intensity*=fitScale;
					}
				});
			} */
			//remove previous scene
			if(this.loadedScene){
				let ls=this.loadedScene;
				ls.parent.remove(ls);
				if(ls.actions){
					ls.actions.length=0;
				}
			}
			for(let child of this.scene.children){
				if(child===this.loadedScene){
					// child.loadedScene=false;
					if(child)
					child.parent.remove(child);
				}
			}
			this.loadedScene=scene;
			// scene.loadedScene=true;
			// animation
			this.initAnimationMixer(scene);
			// scene.mixer = new THREE.AnimationMixer(scene);
			// this.animationMixer.push(scene.mixer);
			for(let ani of scene.animations){
				const action = this.animationMixer.clipAction(ani);
				scene.actions.push(action);
				action.play();
			}
			this.scene.add(scene);
			this.refresh();
			this.resetView();
		}else{
			throw(new TypeError('scene must be an instance of THREE.Object3D'));
		}
	}
	findTarget(target,typeonly=null,findAll=false){
		let result;
		if(findAll)result=[];
		if(typeof target=='string' || target instanceof RegExp){
			this.processObjects(this.scene,(obj)=>{
				if(obj.name.match(target)){
					if(typeonly){
						if((obj instanceof typeonly )=== false)return;
					}
					return true;
				}
			},obj=>{
				if(findAll){
					result.push(obj);
				}else{
					result=obj;
					return true;//stop searching
				}
			});
			return result;
		}else{
			throw(new TypeError('target should be string or RegExp'));
		}
	}
	processObjects(root,findFunc,process){
		if(findFunc(root)){
			if(process(root)===true)
				return true;
		}
		if(root.children.length){
			for(let o of root.children){
				if(this.processObjects(o,findFunc,process)===true){
					return true;
				}
			}
		}
	}
	refresh(callloop=false){
		this.emit('beforeRefresh');
		this.animationMixer.update(this.clock.getDelta());
		this.controls.update();
		if(this.scene&&this.camera)
			this.renderer.render(this.scene,this.camera);
		this.emit('aftereRefresh');
		if(this.animating||callloop){requestAnimationFrame(()=>this.refresh());}
	}
	/* nextFrame(cb){
		if(this.frameCalls.length===0)
		requestAnimationFrame(()=>{
			let list=this.frameCalls;
			this.frameCalls=[];
			let c;
			while(c=list.shift()){
				c();
			}
		});
		this.frameCalls.push(cb);
	} */
	static calcCenter(points){
		// console.log(points)
		let x=0,y=0,z=0,L=points.length;
		for(let p of points){
			x+=p.x;
			y+=p.y;
			z+=p.z;
		}
		return new THREE.Vector3(x/L,y/L,z/L);
	}
};
itisModelViewer.THREE=THREE;

window.itisModelViewer=itisModelViewer;