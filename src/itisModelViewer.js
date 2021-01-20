const THREE=require('three');
const NodeUrl = require('url');
// import { GLTFLoader } from 'three/examples/js/loaders/GLTFLoader.js';
// import { OrbitControls } from 'three/examples/js/controls/OrbitControls.js';
const { GLTFLoader }=require('three/examples/jsm/loaders/GLTFLoader.js');
const { OrbitControls }=require('three/examples/jsm/controls/OrbitControls.js');
const { FBXLoader } =require('three/examples/jsm/loaders/FBXLoader.js');

import {enableMouseDrag,addEvents} from './eventUtils.js';
const EventEmitter = require('events');
class itisModelViewer extends EventEmitter{
	_vars(){
		this.opts=null;//save the options
		this.renderer=null;
		this.clock=new THREE.Clock();//clock for animation
		this.animationMixerList=null;
		this.defaultCamera=null;//for view of scene's transform
		this.defaultScene=null;//loaded when no url specified
		this.currentCamera=null;//current using camera
		this.currentScene=null;//current using scene
		this.controls=null;
		this._maxPointPosition=0;
	}
	get width(){return this.opts.width;}
	set width(v){this.opts.width=v;}
	get height(){return this.opts.height;}
	set height(v){this.opts.height=v;}
	get camera(){return this.currentCamera;}
	get scene(){return this.currentScene;}
	constructor(url,opts){
		super();
		this._vars();
		this.opts=opts=Object.assign({
			canvas:undefined,
			width:0,
			height:0,
			parent:document.body,
			rendererOpts:undefined,
			defaultCube:true,
		},opts);
		
		this.width=opts.width||opts.canvas?.width||300;
		this.height=opts.height||opts.canvas?.height||300;

		this.initRenderer();
		this.initDefaultCamera();
		if(url){
			this.initDefaultScene(false);
			this.loadFile(url);
		}else{
			this.initDefaultScene();
		}
		this.initAnimationMixer();
		this.initControls();
		this._setMouseEvents();
	}
	initRenderer(){
		const opts=this.opts;
		/* create a renderer */
		const defaultRendererOpts={
			canvas:opts.canvas,
			antialias:true,
			alpha:false,
			precision:'highp',
		};
		const rendererOpts=Object.assign({},defaultRendererOpts,opts.rendererOpts);
		const renderer=this.renderer = new THREE.WebGLRenderer(rendererOpts);
		renderer.setSize(this.width,this.height);
		renderer.setClearColor(new THREE.Color( "rgb(20,20,20)"));
		if(!opts.canvas){
			opts.parent.appendChild(renderer.domElement);
		}
	}
	initDefaultScene(createDefaultObject=true){
		const opts=this.opts;
		/* create default scene */
		const scene=this.defaultScene = new THREE.Scene();
		/* const moveScene=this.moveScene = new THREE.Scene();
		const rotateScene=this.rotateScene = new THREE.Scene(); */
	/* 	scene.add(moveScene);
		moveScene.add(rotateScene); */
		// rotateScene.rotation.x=Math.PI/180*45;
		if(createDefaultObject){
			/* create a light */
			const light = new THREE.SpotLight( 0xFFFFFF, 0.8 );
			light.position.set(0, 20, 0);
			light.castShadow = true;
			this.defaultScene.add(light);
	
			/* create a cube */
			if(this.opts.defaultCube){
				const cube = new THREE.Mesh( new THREE.BoxGeometry(), new THREE.MeshPhongMaterial( { color: 0x66ccff } ) );
				this.defaultScene.add( cube );
				this.on('beforeRefresh',()=>{
					cube.rotation.x += 0.01;
					cube.rotation.y += 0.01;
				});
			}
		}
		this.setCamera(this.defaultCamera);
		this.setScene(scene);
	}
	initControls(){
		const controls =this.controls= new OrbitControls(this.camera, this.renderer.domElement );
		controls.dampingFactor=0.01;
		controls.enableDamping=true;
		// controls.enableZoom=false;
		controls.mouseButtons = {
			LEFT: THREE.MOUSE.ROTATE,
			MIDDLE: THREE.MOUSE.PAN,
			// RIGHT: THREE.MOUSE.RIGHT,
		};
		controls.zoomSpeed=0.5;
		controls.saveState();
		this.on('beforeRefresh',e=>{
			controls.update();
		});
	}
	initDefaultCamera(){
		/* create a default camera */
		const camera=this.defaultCamera = new THREE.PerspectiveCamera( 75,this.width / this.height, 0.001, 1000 );
		camera.position.set(0,5,5);
		camera.lookAt(0,0,0);
	}
	initAnimationMixer(){
		const opts=this.opts;
		/* mixers */
		this.animationMixerList=[];
	}
	resize(width,height){

	}
	_setMouseEvents(){
		/* const ca=this.camera,
			S=this.scene;
		enableMouseDrag();
		this.renderer.domElement.setAttribute('mousedragevent','true'); */
		addEvents(this.renderer.domElement,{
			/* 'mousedrag':e=>{
				const S=this.scene;
				let B=e.buttons;//1:L 2:R 3:L+R 4:M 5:L+M 6:R+M 7:L+R+M
				switch(B){
					case 1:{//rotate
						S.rotation.x+=e.movementY/500;
						S.rotation.y+=e.movementX/500;
						break;
					}
					case 4:{//move
						S.position.x+=e.movementX/100;
						S.position.y-=e.movementY/100;
						break;
					}
				}
			}, */
			/* 'wheel':e=>{//scale
				const S=this.scene;
				let s=S.scale.x*(1-e.deltaY/1000);
				if(s<0.01)s=0.01;
				else if(s>1000)s=1000;
				S.scale.set(s,s,s);
			}, */
			/* 'click':e=>{
				if(e.buttons===2){
					e.preventDefault();
					this.resetView();
				}
			}, */
			'contextmenu':e=>{/* this.resetView(); */this.controls.reset();e.preventDefault()},
		});
	}
	resetView(){
		const S=this.scene;
		S.rotation.set(0,0,0);// S.rotation.set(Math.PI/180*45,0,0);
		S.position.set(0,0,0);
		let scale=this.getFitScale();
		S.scale.set(scale,scale,scale);
		this.setCamera(this.defaultCamera);
		this.camera.position.set(0,5,5);
		this.camera.lookAt(0,0,0);
	}
	getFitScale(){
		return 2.5/(this._maxPointPosition||2.5);
	}
	loadFile(fileurl){
		const url=NodeUrl.parse(fileurl);
		let loader;
		if(url.pathname.match(/.gl(b|tf)$/i)){
			loader = new GLTFLoader();
		}else if(url.pathname.match(/.fbx$/i)){
			loader = new FBXLoader();
		}else{
			throw(new Error('format not supported'));
		}
		loader.load(fileurl,result=>{
			console.log('file loaded',result);
			let scene;
			if(result instanceof THREE.Object3D){
				scene=result;
			}else{
				scene=result.scene;
			}
			scene.traverse(child=>{
				if ( child.isMesh ) {
					child.castShadow = true;
					child.receiveShadow = true;
					if(child.geometry){
						console.log(child);
						let {min,max}=child.geometry.boundingBox;
						let ps=[min.x,min.y,min.z,max.x,max.y,max.z].map(v=>Math.abs(v));
						this._maxPointPosition=Math.max(...ps);
					}
				}
			} );
			console.log('最远点',this._maxPointPosition);

			/* convert lights 
				light's intensity clamp between 0-1 here */
			/* this.processObjects(scene,o=>o instanceof THREE.Light,light=>{
				if(light instanceof THREE.DirectionalLight){
					// light.intensity/=10;
				}else{
					light.intensity/=10;
				}
			}); */
			this.scene.add(scene);
			this.resetView();

			result.mixer = new THREE.AnimationMixer(scene);
			this.animationMixerList.push(result.mixer);
			for(let ani of result.animations){
				const action = result.mixer.clipAction(ani);
				action.play();
			}
		},xhr=>{
			// console.log(xhr.loaded, ' loaded' );
		},error=>{
			console.error( error );
		});
	}
	setCamera(target,findCameraOnly=true){
		if(target===null){
			this.defaultCamera.parent=null;
			this.currentCamera=this.defaultCamera;
			return;
		}else if(typeof target=='string' || target instanceof RegExp){
			let found=this.findTarget(target,findCameraOnly?THREE.Camera:null);
			if(found){
				this.setCamera(found);
			}
			/* this.processObjects(this.scene,(obj)=>{
				if(obj.name.match(target)){
					if(findCameraOnly){
						if((obj instanceof THREE.Camera )=== false)return;
					}
					return true;
				}
			},camera=>{
				return true;//stop searching
			}); */
			return;
		}else if(target instanceof THREE.Camera){
			this.currentCamera=target;
		}else if(target instanceof THREE.Object3D){
			target.add(this.defaultCamera);
			this.currentCamera=this.defaultCamera;
		}
	}
	setScene(scene){
		if(scene instanceof THREE.Object3D){
			this.currentScene=scene;
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
	refresh(){
		this.emit('beforeRefresh');
		for(let mixer of this.animationMixerList){
			mixer.update(this.clock.getDelta());
		}
		this.controls.update();
		if(this.scene&&this.camera)
			this.renderer.render(this.scene,this.camera);
		this.emit('aftereRefresh');
	}

};
itisModelViewer.THREE=THREE;

window.itisModelViewer=itisModelViewer;