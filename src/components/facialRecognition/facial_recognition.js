import { useEffect, useRef, useState } from 'react';
import './facial_recognition.css';
import * as faceapi from 'face-api.js'
import Alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

const FacialRecognition = () => {
  const [stream, setStream] = useState();
  const [state, setState] = useState({
    name: ""
  });
  const [isModalLoaded, setIsModalLoaded] = useState(false);
  const [video, setVideo] = useState();
  const canvasRef = useRef();
  const [descriptors, setDescriptors] = useState([]);
  const [isLoading, setIsLoading] = useState();
  var myInterval;

  async function readTextFile(file) {
    await fetch('../descriptor.txt')
      .then((r) => r.text())
      .then(text => {
        setDescriptors(text);
        console.log(text);
      })
  }


  useEffect(() => {
    // readTextFile()
    loadModels();
  }, []);

  useEffect(() => {
    loadDescriptors();
  }, [isModalLoaded])

  const loadDescriptors = async () => {
    if (isModalLoaded && descriptors && descriptors.length === 0) {
      await handleOnChangeImage();
      console.log('discriptors generated')
    }
  }

  const loadModels = async () => {
    const url = '/models';
    await faceapi.loadTinyFaceDetectorModel(url)
    await faceapi.loadFaceLandmarkTinyModel(url)
    await faceapi.loadFaceExpressionModel(url)
    await faceapi.loadFaceRecognitionModel(url)
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/models');
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    console.log('modal loaded')
    setIsModalLoaded(true);

  }

  const startWebCam = async () => {
    if (isModalLoaded && descriptors && descriptors.length > 0) {
      navigator.mediaDevices
        .getUserMedia({
          video: true
        })
        .then((stream) => {
          setStream(stream);
        });
    };

  };


  const handleRecognitionFace = async () => {
    console.log("handleRecognitionFace");

    let canvas = canvasRef.current;
    canvas = await faceapi.createCanvas(video);
    document.body.append(canvas);
    const displaySize = { width: video.width, height: video.height };
    await faceapi.matchDimensions(canvas, displaySize);
    if (descriptors) {

      const faceMatcher = await new faceapi.FaceMatcher(descriptors, 0.4);
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
      const resizedDetections = await faceapi.resizeResults(detections, displaySize);
      let results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))
      console.log(faceMatcher, 'check', results);


      myInterval = setInterval(async () => {
        console.log("handleRecognitionFace Interval");
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = await faceapi.resizeResults(detections, displaySize);

        canvas.getContext('2d').clearRect(0, 0, canvas.height, canvas.width);

        let results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor))
        console.log(faceMatcher, 'check', results)

        results.forEach(async (result, i) => {
          console.log('see result =>', result);
          const box = resizedDetections[i].detection.box
          const similarity = `${parseFloat(100 - (result.distance * 100)).toFixed(2)}`;
          console.log(similarity)
          const drawBox = await new faceapi.draw.DrawBox(box, { label: `${result.label}(${similarity})` });
          drawBox.draw(canvas)
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)

          // clearInterval(myInterval);
          // if(result.distance === 0){

          // }
        });

      }, 100);
    }
  };


  const stopWebCam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }
    setStream(null);
  };

  const handleOnChangeImage = async (e) => {
    setIsLoading(true);
    const descriptions = [];
    for (let i = 1; i < 5; i++) {
      console.log('loding', i)

      const img = await faceapi.fetchImage(`../images/${i}.jpg`);
      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detections && detections.descriptor) {
        // code 
        let f32jsonArr = JSON.stringify(Array.from(detections.descriptor));


        // decode
        let df32jsonArr = new Float32Array(JSON.parse(f32jsonArr));

        const JsonStr = JSON.stringify((detections.descriptor));
        console.log(df32jsonArr, f32jsonArr);
        descriptions.push(df32jsonArr);
      }
    }
    console.log(descriptions)

    setDescriptors(descriptions);
    setIsLoading(false);
    Alertify.success("Image Descriptor successfully");
    return new faceapi.LabeledFaceDescriptors('roy', descriptions);
  }

  return (
    <>
      {/* <div className='row' style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}> */}
      <div id="control">
        <input type="text" name="name" value={state.name} id="name" onChange={(e) => setState({ name: e.target.value })} />

        {/* <input type="file" id="imageUpload" multiple src="./images/ravi.jpg" onChange={e => handleOnChangeImage(e)} /> */}
        <input type="file" onChange={e => handleOnChangeImage(e)} />
        {/* <img alt="preview image" src={img} /> */}

        <button onClick={startWebCam}><img src="images/play.svg" with="24" height="24" /> start recognizing</button>
        <button className="WebCamButton" onClick={stopWebCam}>
          Stop
        </button>
      </div>
      <div id="border_wrap" className='row'>
        {stream && (
          <video
            width="250" height="250"
            id="video"
            autoPlay muted
            onPlay={handleRecognitionFace}
            ref={(video) => {
              if (video) {
                console.log(video)
                setVideo(video);
                video.srcObject = stream;
              }
            }}
          />

        )}
        <canvas ref={canvasRef} id='canvas' />

      </div>
      {/* </div> */}
    </>
  );
};

export default FacialRecognition;