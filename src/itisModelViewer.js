const THREE=require('three');
const NodeUrl = require('url');
// import { GLTFLoader } from 'three/examples/js/loaders/GLTFLoader.js';
// import { OrbitControls } from 'three/examples/js/controls/OrbitControls.js';
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
		this.animationMixerList=null;
		this.defaultCamera=null;//for view of scene's transform
		this.defaultScene=null;//loaded when no url specified
		this.currentCamera=null;//current using camera
		// this.currentScene=null;//current using scene
		this.controls=null;
		this._maxPointPosition=0;
		this._bounding={
			xmax:0,xmin:0,
			ymax:0,ymin:0,
			zmax:0,zmin:0,
		}
	}
	get width(){return this.opts.width;}
	set width(v){this.opts.width=v;}
	get height(){return this.opts.height;}
	set height(v){this.opts.height=v;}
	get camera(){return this.currentCamera;}
	get scene(){return this.defaultScene;}
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
		// renderer.shadowMap.enabled = true;
		if(!opts.canvas){
			opts.parent.appendChild(renderer.domElement);
		}
	}
	initDefaultScene(createDefaultObject=true){
		const opts=this.opts;
		/* create default scene */
		const scene=this.defaultScene = new THREE.Scene();
		// rotateScene.rotation.x=Math.PI/180*45;
		/* create a light */
		const alight = new THREE.AmbientLight( 0x404040 ); // soft white light
		alight.name='default_light';
		alight.intensity=4;
		this.scene.add(alight);
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

		if(createDefaultObject){
			/* create a cube */
			const cube = new THREE.Mesh( new THREE.BoxGeometry(), new THREE.MeshPhongMaterial( { color: 0x66ccff } ) );
			this.defaultScene.add( cube );
			this.on('beforeRefresh',()=>{
				cube.rotation.x += 0.01;
				cube.rotation.y += 0.01;
			});
		}
		// this.scene.add(this.defaultCamera);
		this.setCamera(this.defaultCamera);
		// this.setScene(scene);
	}
	initControls(){
		const controls =this.controls= new OrbitControls(this.camera, this.renderer.domElement );
		controls.dampingFactor=0.05;
		controls.enableDamping=true;
		controls.mouseButtons = {
			LEFT: THREE.MOUSE.ROTATE,
			MIDDLE: THREE.MOUSE.PAN,
			// RIGHT: THREE.MOUSE.RIGHT,
		};
		controls.zoomSpeed=0.3;
		controls.saveState();
		/* controls.on('change',e=>{
			console.log(e)
		}) */
		this.on('beforeRefresh',e=>{
			controls.update();
		});
	}
	initDefaultCamera(){
		/* create a default camera */
		const camera=this.defaultCamera = new THREE.PerspectiveCamera( 75,this.width / this.height, 0.001, 1000 );
		camera.position.set(0,1,5);
		camera.lookAt(0,0,0);
	}
	initAnimationMixer(){
		const opts=this.opts;
		/* mixers */
		this.animationMixerList=[];
	}
	resize(width,height){
		if(this.camera){
			this.camera.aspect=width/height;
			this.camera.updateProjectionMatrix();
		}
		this.renderer.setSize(width,height,true);
	}
	_setMouseEvents(){
		addEvents(this.renderer.domElement,{
			'contextmenu':e=>{this.controls.reset();e.preventDefault()},
		});
	}
	resetView(){
		/* const S=this.scene;
		let scale=this.getFitScale();
		S.scale.set(scale,scale,scale); */
		/* this.setCamera(this.defaultCamera);
		this.camera.position.set(0,1,5);
		this.camera.lookAt(0,0,0); */
	}
	getFitScale(){
		return 3/(this._maxPointPosition||3);
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
			if(result instanceof THREE.Object3D){//the result may be a n object3d or a scene depends on the loader
				scene=result;
			}else if(result.scene instanceof THREE.Object3D){
				scene=result.scene;
			}else{
				throw(new Error('not supported model'));
			}
			scene.traverse(child=>{
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
			// this.resetView();

			result.mixer = new THREE.AnimationMixer(scene);
			this.animationMixerList.push(result.mixer);
			for(let ani of result.animations){
				const action = result.mixer.clipAction(ani);
				action.play();
			}
			this.emit('fileloaded');
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
				return found;
			}
			return;
		}else if(target instanceof THREE.Camera){
			this.currentCamera=target;
		}else if(target instanceof THREE.Object3D){
			target.add(this.defaultCamera);
			this.currentCamera=this.defaultCamera;
		}
	}
	setScene(scene){
		if(scene===this.scene){
			throw(new Error('cannot add default scene to it self'));
		}
		if(scene instanceof THREE.Object3D){
			let hasLight=false;
			let _b=this._bounding;//find the border of all models
			scene.traverse(child=>{
				if(child instanceof THREE.Light)hasLight=true;//check if there are lights
				if (child.isMesh) {
					if(child.geometry){
						let {min,max}=child.geometry.boundingBox;
						let ps=[min.x,min.y,min.z,max.x,max.y,max.z].map(v=>Math.abs(v));
						this._maxPointPosition=Math.max(...ps);
						if(min.x<_b.xmin)_b.xmin=min.x;
						if(min.y<_b.ymin)_b.ymin=min.y;
						if(min.z<_b.zmin)_b.zmin=min.z;
						if(max.x>_b.xmax)_b.xmax=max.x;
						if(max.y>_b.ymax)_b.ymax=max.y;
						if(max.z>_b.zmax)_b.zmax=max.z;
					}
				}
			});
			this.scene.getObjectByName('default_light').visible=!hasLight;//show default light if there is no light
			//change scale of the scene to fit screen
			let scale=this.getFitScale();
			scene.scale.set(scale,scale,scale);
			if(this.opts.focusOnObject){
				scene.position.set(-(_b.xmin+_b.xmax)/2*scale,-(_b.zmin+_b.zmax)/2*scale,-(_b.ymin+_b.ymax)/2*scale);
			}

			for(let child of this.scene.children){//remove previous scene
				if(child.loadedScene===true){
					child.loadedScene=false;
					child.parent=null;
				}
			}
			scene.loadedScene=true;
			this.scene.add(scene);
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