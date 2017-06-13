// var ndarray = require("ndarray")
//var savePixels = require("save-pixels")

var imageRepository = require('./captcha/imagerepository').init("./captcha/data.dat");
var imageUtil = require('./captcha/imageutil');

var imageProcessor = require('./captcha/imageprocessor').config({
    MINOR_PIXEL_NOISE_LIMIT: 20,
    BACKGROUND_COLOR: 255,
    COLOR_RANGE_OFFSET: 5,
    HOLLOW_PIXELS_MAX_NUM: 20,
    COLOR_ISLET_MAX_NUM: 20
});

exports.crackCaptcha = crackCaptcha;

function crackCaptcha(imageData) {
    var captachStr = "";
    try {
        var imgs = imageProcessor.getMainColorGroupImages(imageData);
        for (var i = 0; i < imgs.length; i++) {
            imageProcessor.rotateToMinWidth(imgs[i]);
            imageUtil.makeSingleColor(imgs[i], 0);

            imgs[i] = imageUtil.removePadding(imgs[i], 255);
            imgs[i] = imageUtil.scale(imgs[i], 32, 32);

            // var nda = ndarray(new Float32Array(imgs[i].data), [imgs[i].width, imgs[i].height, 4], [4, imgs[i].width * 4, 1]);
            // savePixels(nda, "png").pipe(fs.createWriteStream("lufax/guess/" + i + ".png"));

            var charactor = imageRepository.guess(imgs[i], "charactor");
            // console.log("charactor:", charactor)
            captachStr += charactor;
        }

    } catch (e){
       captachStr = "";
       console.log("crackCaptcha", captachStr) 
    }

    return captachStr;
}

