// base class to pass to WebRtcSB for manipulating an image
class ImageManipulate
{
    constructor() {}
    manipulate(canvasContext, hiddenVideoElement)
    {
        throw new Error('must implement manipulate function');
    }
}

class ImageCopy extends ImageManipulate
{
    manipulate(canvasContext, hiddenVideoElement)
    {
        canvasContext.drawImage(hiddenVideoElement, 0, 0, hiddenVideoElement.videoWidth, hiddenVideoElement.videoHeight);
    }
}

class ImageAdd extends ImageManipulate
{
    constructor(imagePath = 'sb.png',
                imagePosX = 10,
                imagePosY = 10,
                imageWidth = 50,
                imageHeight = 50)
    {
        super();
        this._myImage = new Image();
        this._myImage.src = imagePath;
        this._imagePos = {X: imagePosX, Y: imagePosY, W: imageWidth, H: imageHeight};
    }

    manipulate(canvasContext, hiddenVideoElement)
    {
        canvasContext.drawImage(this._myImage, this._imagePos.X, this._imagePos.Y, this._imagePos.W, this._imagePos.H);
    }
}

class TextAdd extends ImageManipulate
{
    constructor(textValue = '',
                textPosX = 10,
                textPosY = 10,
                textOptions = {
                    fontType:  null,
                    color: null,
                    size: null,
                    bold: false,
                    italic: false,
                    outline: false,
                    outlineColor: 'black',
                    outlineWidth: 5
                })
    {
        super();
        this._text = textValue;
        this._textPos = {X: textPosX, Y: textPosY};
        this._options = textOptions;
    }

    manipulate(canvasContext, hiddenVideoElement)
    {
        if (this._options.fontType) {
            canvasContext.font.replace('sans-serif', this._options.fontType);
        }
        if (this._options.color) {
            canvasContext.fillStyle = this._options.color;
        }
        if (this._options.size) {
            canvasContext.font = canvasContext.font.replace(/\d+px/, this._options.size);
        }
        if (this._options.bold) {
            canvasContext.font = 'bold ' + canvasContext.font;
        }
        if (this._options.italic) {
            canvasContext.font = 'italic ' + canvasContext.font;
        }
        if (this._options.outline) {
            if (this._options.outlineColor) {
                canvasContext.strokeStyle  = this._options.outlineColor;
            }
            if (this._options.outlineWidth) {
                canvasContext.lineWidth = this._options.outlineWidth;
            }
            canvasContext.strokeText(this._text, this._textPos.X, this._textPos.Y);
        }
        canvasContext.fillText(this._text, this._textPos.X, this._textPos.Y);
    }
}

/**
 * For HTML manipulations over video stream
 */
class HTMLAdd extends ImageManipulate
{
    constructor()
    {
        super();
        this._capturedImage = new Image;

        this.parentContainer = document.createElement('div');
        this.parentContainer.id = 'parentContainer';
        this.parentContainer.style.position = 'relative';
        this.parentContainer.style.height = '0';
        this.parentContainer.style.width = '0';
        this.parentContainer.style.opacity = '0';
        this.parentContainer.style.overflow = 'hidden';

        let canvasHTML = document.createElement('div');
        canvasHTML.style.position = 'absolute';

        this.canvasHTML = canvasHTML;
        this.canvasHTMLNodes = {};
        this.parentContainer.append(canvasHTML);
        document.body.append(this.parentContainer);
        
        this.buildCompleted = false;
        this.buildRequired = true;
        if (typeof html2canvas == 'undefined') {
            throw new ReferenceError('Dependency not found. required dependency html2canvas.js');
        }
    }

    buildImage (hiddenVideoElement) {
        console.debug("building snapshot...");
        this.isBuilding = true;
        this.canvasHTML.style.height = hiddenVideoElement.videoHeight + 'px';
        this.canvasHTML.style.width = hiddenVideoElement.videoWidth + 'px';
        html2canvas(this.canvasHTML, {backgroundColor:null}).then((canvas) => {
            this._capturedImage.src = canvas.toDataURL();
            this.isBuilding = false;
        });
    }

    setHtmlObject (htmlObject) {
        this.canvasHTML.append(htmlObject)
        this.buildRequired = true; // for update
    }

    setLabel (label, cssStyle = {}) {
        let defaultStyleObject = {
            color: 'yellow',
            background: 'black',
            fontSize: '20px',
            opacity: '0.5',
            display: 'inline-block',
            padding: parseInt(cssStyle.fontSize)/10 + "px"
        };
        cssStyle = Object.assign(defaultStyleObject, cssStyle);
        let labelElement = document.createElement('div');
        labelElement.innerText = label;
        Object.keys(cssStyle).forEach(function(key) {
            labelElement.style[key] = cssStyle[key];
        });
        this.canvasHTML.append(labelElement);
        this.canvasHTML.labelElement = labelElement;
        this.buildRequired = true; // for update
    }

    async addVideoMuted (centerImageURL, bgStyle={}, imageStyle={}) {
        if (this.canvasHTMLNodes.background) {
            return false;
        }
        // background overlay
        let defaultBgStyleObject = {
            width: '100%',
            height: '100%',
            background: 'grey',
            position: 'absolute',
            top: 0,
            zIndex: -1
        };
        bgStyle = Object.assign(defaultBgStyleObject, bgStyle);
        let background = this.createContanerHTML();
        Object.keys(bgStyle).forEach(function(key) {
            background.style[key] = bgStyle[key];
        });

        // rounded image
        let image =  document.createElement('img');
        image.src = await getImageData(centerImageURL);
        let defaultImageStyleObject = {
            position: 'relative',
            width: '150px',
            top: 'calc(50% - 75px)',
            left: 'calc(50% - 75px)',
            borderRadius: '50%',
            border: '5px solid #8d8dbd'
        };
        imageStyle = Object.assign(defaultImageStyleObject, imageStyle);
        Object.keys(imageStyle).forEach(function(key) {
            image.style[key] = imageStyle[key];
        });

        background.append(image);
        this.canvasHTML.append(background);
        this.canvasHTMLNodes.centerImage = image;
        this.canvasHTMLNodes.background = background;
        this.buildRequired = true; // for update
    }

    async removeVideoMuted () {
        if (this.canvasHTMLNodes.background) {
            this.canvasHTMLNodes.background.remove();
            delete this.canvasHTMLNodes.background
        }
        if (this.canvasHTMLNodes.centerImage) {
            delete this.canvasHTMLNodes.centerImage;
        }
        this.buildRequired = true; // for update in stream
    }

    createContanerHTML(cssStyle = {}) {
        let defaultStyleObject = {
            width: '100%',
            height: '100%',
            background: 'yellow',
            position: 'absolute',
            top: 0,
            zIndex: -1
        };
        cssStyle = Object.assign(defaultStyleObject, cssStyle);

        let wrapper = document.createElement('div');
        Object.keys(cssStyle).forEach(function(key) {
            wrapper.style[key] = cssStyle[key];
        });
        return wrapper;
    }

    async manipulate(canvasContext, hiddenVideoElement)
    {
        if (!this.isBuilding && this.buildRequired) {
            await this.buildImage(hiddenVideoElement);
            this.buildRequired = false;
        }
        canvasContext.drawImage(this._capturedImage, 0, 0, hiddenVideoElement.videoWidth, hiddenVideoElement.videoHeight);
    }
}

class WebRtcSB
{
    constructor(constraints = {video: true, audio: true})
    {
        this._constraints = constraints;
        this._createHiddenVideoElement();
    }

    setManipulators(ImageManipulators)
    {
        this._ImageManipulators = ImageManipulators;
    }

    // returns a promise resolving to a MediaStream
    sbStartCapture(constraints=null)
    {
        this._constraints = constraints || this._constraints;
        return Promise.resolve()
            .then(()=>{
                return navigator.mediaDevices.getUserMedia(this._constraints);
            })
            .then((stream) => {
                return this.stampOnStream(stream);
            })
    }

    stampOnStream(mediaStream)
    {
        return Promise.resolve()
            .then(() => {
                let canvasStream = new MediaStream();
                let videoTrack = mediaStream.getVideoTracks()[0];
                canvasStream.addTrack(videoTrack);
                this._hiddenVideoElement.srcObject = canvasStream;
                return Promise.resolve();
            })
            .then(() => {
                this._createHiddenCanvas();
                requestAnimationFrame(this._sendImageToCanvas.bind(this));
                return this._hiddenCanvasElement.captureStream();
            })
            .then((stampedStream) => {
                let outputStream = new MediaStream();
                let videoTrack = stampedStream.getVideoTracks()[0];
                outputStream.addTrack(videoTrack);
                if (mediaStream.getAudioTracks().length > 0) {
                    let audioTrack = mediaStream.getAudioTracks()[0];
                    outputStream.addTrack(audioTrack);
                }
                return outputStream;
            });
    }

    _createHiddenVideoElement()
    {
        this._hiddenVideoElement = document.createElement('video');
        this._hiddenVideoElement.setAttribute("autoplay", 'true');
        this._hiddenVideoElement.setAttribute("playsinline", true);
        this._hiddenVideoElement.setAttribute('muted', 'true');

        // safari wont play the video if the element is not visible on screen, so instead of hidden, put a 1 pix
        if (this._isSafari()) {
            this._hiddenVideoElement.setAttribute("width", '1px');
            this._hiddenVideoElement.setAttribute("height", '1px');
        }
        else{
            this._hiddenVideoElement.style.display = 'none';
        }
        document.body.appendChild(this._hiddenVideoElement);
    }

    _createHiddenCanvas()
    {
        this._hiddenCanvasElement = document.createElement('canvas');
        this._hiddenCanvasElement.style.display = 'none';
        this._hiddenCanvasElement.setAttribute("width", '0');
        this._hiddenCanvasElement.setAttribute("height", '0');
        document.body.appendChild(this._hiddenCanvasElement);
        this._sbVidContext = this._hiddenCanvasElement.getContext("2d");
    }
    
    _sendImageToCanvas()
    {
        if (this._hiddenCanvasElement.width === 0 && this._hiddenVideoElement.videoWidth !== 0){
            this._hiddenCanvasElement.setAttribute("width", this._hiddenVideoElement.videoWidth);
            this._hiddenCanvasElement.setAttribute("height", this._hiddenVideoElement.videoHeight);
        }

        if (this._hiddenCanvasElement.width !== 0) {
            this._ImageManipulators.forEach((manipulator) =>{
                manipulator.manipulate(this._sbVidContext, this._hiddenVideoElement);
            });
        }
        requestAnimationFrame(this._sendImageToCanvas.bind(this));
    }

    _isSafari()
    {
        var ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf('safari') != -1) {
            if (ua.indexOf('chrome') == -1) {
                return true;
            }
        }
        return false;
    }
}

/**
 * Convert image URL to image data URI
 * 
 * @param {string} url Image URL
 * @returns {string} Data URI
 */
function getImageData (url) {
    return new Promise((resolve, reject) => {
        let canvas = document.createElement("canvas");
        image = new Image();
        image.setAttribute('crossorigin', 'anonymous');
        image.src = url;
        image.onload = () => {
            canvas.width = image.height;
            canvas.height = image.height;
            canvas.getContext('2d').drawImage(image, 0 , 0,  image.height, image.width);
            resolve(canvas.toDataURL());
        }
        image.onerror = reject;
    });
}