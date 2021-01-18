const THREE=require('three');
import { GLTFLoader } from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {enableMouseDrag,addEvents} from './eventUtils.js';
const EventEmitter = require('events');
class itisModelViewer extends EventEmitter{
	_vars(){
		this.opts=null;//save the options
		this.renderer=null;
		/* this.moveScene=null;
		this.rotateScene=null; */
		this.clock=new THREE.Clock();//clock for animation
		this.animationMixerList=null;
		this.defaultCamera=null;//for view of scene's transform
		this.defaultScene=null;//loaded when no url specified
		this.currentCamera=null;//current using camera
		this.currentScene=null;//current using scene
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
			this.loadGLTF(url);
		}else{
			this.initDefaultScene();
		}
		this.initAnimationMixer();
		this._setMouseEvents();
	}
	initRenderer(){
		const opts=this.opts;
		/* create a renderer */
		const defaultRendererOpts={
			canvas:opts.canvas,
			antialias:true,
			alpha:false,
		};
		const rendererOpts=Object.assign({},defaultRendererOpts,opts.rendererOpts);
		const renderer=this.renderer = new THREE.WebGLRenderer(rendererOpts);
		renderer.setSize(this.width,this.height);
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
	initDefaultCamera(){
		/* create a default camera */
		const camera=this.defaultCamera = new THREE.PerspectiveCamera( 75,this.width / this.height, 0.1, 1000 );
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
		/*const ca=this.camera,
			S=this.scene ,
			R=this.rotateScene,
			M=this.moveScene */;
		enableMouseDrag();
		this.renderer.domElement.setAttribute('mousedragevent','true');
		addEvents(this.renderer.domElement,{
			'mousedrag':e=>{
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
			},
			'wheel':e=>{//scale
				const S=this.scene;
				let s=S.scale.x*(1-e.deltaY/1000);
				if(s<0.01)s=0.01;
				else if(s>10)s=10;
				S.scale.set(s,s,s);
			},
			'mousedown':e=>{
				if(e.buttons===2){
					e.preventDefault();
					this.resetView();
				}
			},
			'contextmenu':e=>e.preventDefault(),
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

		return 1;
	}
	loadGLTF(url){
		const loader = new GLTFLoader();
		loader.load(url,gltf=>{
			console.log(gltf)
			/* convert lights 
				light's intensity clamp between 0-1 here */
			this.processObjects(gltf.scene,o=>o instanceof THREE.Light,light=>{
				light.intensity/=1000;
			});
			this.scene.add(gltf.scene);
			this.resetView();


			gltf.mixer = new THREE.AnimationMixer(gltf);
			this.animationMixerList.push(gltf.mixer);
			// const action = gltf.mixer.clipAction(gltf.animations[0]);
			// action.play();
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
		if(this.scene&&this.camera)
			this.renderer.render(this.scene,this.camera);
		this.emit('aftereRefresh');
	}
};
itisModelViewer.THREE=THREE;

window.itisModelViewer=itisModelViewer;