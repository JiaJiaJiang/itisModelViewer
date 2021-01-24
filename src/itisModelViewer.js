import * as THREE from 'three/build/three.module.js';
const NodeUrl = require('url');
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader }  from 'three/examples/jsm/loaders/FBXLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

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
		this.refreshFlag=false;//to prevent multi call of refresh in a frame
		this.raycaster = new THREE.Raycaster();
		this.loaded=false;
		this.controlChanged=false;
		this.postprocessing={
			composer:null,
			renderPass:null,
			bokehPass:null,
			bokehOpts:{
				aperture: 0.008,
				maxblur: 0.005,
			},
		};
	}
	get width(){return this.opts.width;}
	// set width(v){this.opts.width=v;}
	get height(){return this.opts.height;}
	// set height(v){this.opts.height=v;}
	get camera(){return this.currentCamera;}
	get scene(){return this.defaultScene;}
	get animating(){return (Date.now()-this.lastInteractive<this.animatingTime)||(this.animationMixer?.timeScale&&this.loadedScene.actions?.length!==0);}
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
			gridHelper:false,
			wireframe:false,
			noAnimation:false,
			shadow:false,
			meshDebug:false,
			bgColor:undefined,
			defocus:false,
		},opts);
		console.log('options',opts);
		opts.width||(opts.width=opts.canvas?.width||300);
		opts.height||(opts.height=opts.canvas?.height||300);

		this.initRenderer();
		this.initDefaultCamera();
		if(url){
			this.loadFile(url);
		}
		this.initControls();
		this.initDefaultScene();
		if(opts.defocus)this.initComposer();
		if(opts.meshDebug)this.initMeshDebug();
	}
	objectsAt(x,y){
		if(!this.loadedScene)return [];
		this.raycaster.setFromCamera( new THREE.Vector2(
			( x / this.width) * 2 - 1,
			1-( y / this.height) * 2,
		), this.camera );
		const intersects = this.raycaster.intersectObjects( this.loadedScene.children,true );
		return intersects;
	}
	initMeshDebug(){
		let changedObjects=[];
		addEvents(this.renderer.domElement,{
			'mousemove':e=>{
				for(let target of changedObjects){
					target.object.material.wireframe=false;
				}
				changedObjects.length=0;
				changedObjects=this.objectsAt(e.offsetX,e.offsetY);
				for(let target of changedObjects){
					target.object.material.wireframe=true;
				}
				this.refresh();
			}
		});
	}
	initRenderer(){
		const opts=this.opts;
		/* create a renderer */
		const defaultRendererOpts={
			canvas:opts.canvas,
			antialias:devicePixelRatio<=1,
			alpha:false,
			precision:'highp',
			logarithmicDepthBuffer:true,
		};
		const rendererOpts=Object.assign({},defaultRendererOpts,opts.rendererOpts);
		console.log('renderer options',rendererOpts);

		const renderer=this.renderer = new THREE.WebGLRenderer(rendererOpts);
		renderer.setSize(this.width,this.height);
		if(typeof opts.bgColor==='string'&& opts.bgColor.startsWith('0x')){
			opts.bgColor=Number(opts.bgColor);
		}
		if(rendererOpts.alpha===false)
			renderer.setClearColor(new THREE.Color( opts.bgColor||"rgb(20,20,20,0)"));
		renderer.setPixelRatio(devicePixelRatio);
		renderer.sortObjects=false;
		renderer.toneMapping=THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure=1.3;
		renderer.physicallyCorrectLights=true;
		renderer.shadowMap.enabled=opts.shadow;
		renderer.shadowMap.autoUpdate=opts.shadow;
		// renderer.shadowMap.type=THREE.BasicShadowMap;
		// renderer.shadowMap.type=THREE.PCFShadowMap;
		renderer.shadowMap.type=THREE.PCFSoftShadowMap;
		// renderer.shadowMap.type=THREE.VSMShadowMap;

		
		if(!opts.canvas){
			opts.parent.appendChild(renderer.domElement);
		}
	}
	initComposer(){
		let bOpts=this.postprocessing.bokehOpts;
		const composer=this.postprocessing.composer=new EffectComposer(this.renderer),
		rP=this.postprocessing.renderPass=new RenderPass(this.scene,this.camera),
		bP=this.postprocessing.bokehPass=new BokehPass(this.scene,this.camera, {
			focus: 1.0,
			aperture: bOpts.aperture,
			maxblur: bOpts.maxblur,
			width: this.width,
			height:this.height,
		} );
		// composer.setPixelRatio(devicePixelRatio*2);
		// composer.setPixelRatio(devicePixelRatio*2);
		composer.addPass(rP);
		composer.addPass(bP);
	}
	initDefaultScene(/* createDefaultObject=true */){
		const opts=this.opts;
		/* create default scene */
		const scene=this.defaultScene = new THREE.Scene();
		/* create a light */
		const lightA = new THREE.AmbientLight( 0x404040 ); // soft white light
		lightA.intensity=8;
		this.scene.add(lightA);
		this.defaultLights.push(lightA);
		const lightD = new THREE.DirectionalLight( 0xffffff, 1 );
		this._modifyLightShadow(lightD);
		lightD.position.set(10,10,10);
		scene.add(lightD);
		this.defaultLights.push(lightD);

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
		/* create a grid helper */
		if(opts.gridHelper){
			scene.add(new THREE.GridHelper(100, 10));
		}
		function rotateCube(){
			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;
			if(!this.loaded){
				requestAnimationFrame(()=>this.refresh());
			}
		}
		this.on('beforeRefresh',rotateCube);
		// this.scene.add(this.defaultCamera);
		this.setCamera(this.defaultCamera);
		// this.setScene(scene);
	}
	initControls(){
		this._setMouseEvents();
		const controls =this.controls= new OrbitControls(this.camera, this.renderer.domElement );
		controls.dampingFactor=0.05;
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
			this.controlChanged=true;
			if(!this.animating)
				requestAnimationFrame(()=>this.refresh(true));
			this.lastInteractive=Date.now();
		});
		controls.addEventListener('end',e=>{
			if(this.opts.defocus&&this.controlChanged){
				this.updatebokehPass();
			}
		});
		this.on('beforeRefresh',e=>{
			controls.update();
		});
	}
	updatebokehPass(x=this.width/2,y=this.height/2){
		console.log('update',x,y)
		let list=this.objectsAt(x,y);
		if(list.length){
			this.postprocessing.bokehPass.uniforms[ "focus" ].value=list[0].distance;
			this.postprocessing.bokehPass.uniforms[ "aperture" ].value=this.postprocessing.bokehOpts.aperture;
		}else{
			this.postprocessing.bokehPass.uniforms[ "aperture" ].value=this.camera.position.distanceTo(0,0,0);
		}
		this.lastInteractive=Date.now();
		this.refresh();
	}
	initDefaultCamera(){
		/* create a default camera */
		const camera=this.defaultCamera = new THREE.PerspectiveCamera( 75,this.width / this.height, 0.001, 1000 );
		camera.position.set(0,0.5,5);
		camera.lookAt(0,0,0);
		camera.far=1000000;
		this.currentCamera=this.defaultCamera;
	}
	initAnimationMixer(scene){
		const opts=this.opts,A=this.animationMixer;
		if(A){//clear animationMixer
			A.stopAllAction();
			A.uncacheClip();
			A.uncacheRoot();
			A.uncacheAction();
		}
		/* mixers */
		this.animationMixer=new THREE.AnimationMixer(scene);
		scene.actions=[];
		if(opts.noAnimation)this.animationMixer.timeScale=0;
	}
	resize(width,height){
		this.opts.width=width;
		this.opts.height=height;
		if(this.camera){
			this.camera.aspect=width/height;
			this.camera.updateProjectionMatrix();
		}
		this.renderer.setSize(width,height,true);
		if(this.postprocessing.composer)this.postprocessing.composer.setSize(width,height);
		this.refresh();
	}
	_setMouseEvents(){
		addEvents(this.renderer.domElement,{
			'pointerdown':e=>{
				console.log('pointerdown')
				this.controlChanged=false;
			},
			'pointerup':e=>{
				console.log('pointerdown')
				if(this.opts.defocus){
					if(!this.controlChanged){
						console.log('click',e.offsetX,e.offsetY)
						this.updatebokehPass(e.offsetX,e.offsetY);
					}
				}
			},
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
		this.loadedScene.scale.set(scale,scale,scale);
		if(this.opts.focusOnObject){
			// let sceneMax=this.boundingBox.max;
			/* this.defaultCamera.position.set(0,sceneMax.y*0.5,sceneMax.z*3);
			this.defaultCamera.lookAt(center.x,center.y,center.z);
			this.setCamera(null); */
			this.loadedScene.position.set(-center.x*scale,-center.y*scale,-center.z*scale);
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
			scene.traverseVisible(child=>{
				if(child instanceof THREE.Light){
					if(this.renderer.physicallyCorrectLights){
						/* if('power' in child)
							child.power*=child.intensity; */
						if('decay' in child)
							child.decay=1;
						// child.intensity*=100;
					}
					this._modifyLightShadow(child);
				}
				if (child.isMesh&& this.opts.shadow) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
				if(child.material&&this.opts.wireframe){
					child.material.wireframe=true;
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
	_modifyLightShadow(light){
		if(!this.opts.shadow)return;
		light.castShadow=true;
		light.bias=0.001*Math.random();
		light.radius=1.1;
		light.shadow.mapSize.width = 2048;
		light.shadow.mapSize.height = 2048;
		light.shadow.camera.near = 0.1;
		light.shadow.camera.far = 200;
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
			return target;
		}else if(target instanceof THREE.Object3D){
			target.add(this.defaultCamera);
			this.setCamera(this.defaultCamera);
		}
	}
	setScene(scene){
		if(scene===this.scene){
			throw(new Error('cannot add scene to it self'));
		}
		const opts=this.opts;
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
				else if(child instanceof THREE.Light){
					if(opts.shadow){
						child.visible=false;
					}else{
						hasLight=true;//check if there are lights
					}
				}
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
			sceneMin.multiplyScalar(fitScale);
			sceneMax.multiplyScalar(fitScale);
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
			// this.scene.add(this.defaultCamera);
			if(opts.defocus){
				this.updatebokehPass();
			}
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
		if(this.refreshFlag)return;
		requestAnimationFrame(()=>this.refreshFlag=false);//reset the refresh flag
		this.refreshFlag=true;
		this.emit('beforeRefresh');
		let D=this.clock.getDelta();
		this.animationMixer&&this.animationMixer.update(D);
		this.controls.update();
		if(this.scene&&this.camera){
			this.renderer.render(this.scene,this.camera);
			if(this.opts.defocus){
				this.postprocessing.composer.render(D);
			}
		}
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