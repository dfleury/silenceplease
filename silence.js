(function(window, document, console){

    var
        analyzed = false,
        analyzingDuration,
        analysisDuration,
        audio,
        averageRange = 1300, // approximately 1 minute
        counter = 0,
        ctx = new window.webkitAudioContext(),
        elementAnalysis,
        elementAverage,
        elementBody,
        elementMeter,
        elementPeak,
        endAnalysis,
        limit,
        noiseCounter = 0,
        noiseRange = 23, // approximately 1 second
        noiseSum = 0,
        noiseValues = [],
        processor = ctx.createJavaScriptNode(2048, 1, 1),
        request = false,
        startAnalysis,
        source,
        sum = 0,
        tolerance = 0.20,
        values = [],
        waitToAnalyze = 10 * 60 * 1000; // 10 minutes

    // loop through PCM data and calculate average
    // volume for a given 2048 sample buffer
    processor.onaudioprocess = function(evt) {
        var
            average,
            decibel,
            i,
            input = evt.inputBuffer.getChannelData(0),
            len = input.length,
            noiseAverage,
            rms,
            total = 0;

        i = total;

        while ( i < len ) {
            total += Math.abs( input[i++] );
        }

        rms = Math.sqrt( total / len );
        decibel = 20 * (Math.log(rms) / Math.log(10));

        values.push(decibel);
        sum += decibel;
        if (counter === averageRange) {
            sum -= values.shift();
            if (!analyzed) {
                analyzed = true;
                elementPeak.innerHTML = 'READY';
            }
        } else {
            counter += 1;
            elementAnalysis.style.width = (counter * 100 / averageRange) + '%';
        }
        average = sum / counter;

        noiseValues.push(decibel);
        noiseSum += decibel;
        if (analyzingDuration === undefined) {
            analyzingDuration = false;
            startAnalysis = new Date();
        }
        if (noiseCounter === noiseRange) {
            if (analyzingDuration === false) {
                analyzingDuration = true;
                endAnalysis = new Date();
                analysisDuration = endAnalysis.getTime() - startAnalysis.getTime();
                console.log('Data length: ' + analysisDuration + 'ms');
            }
            noiseSum -= noiseValues.shift();
        } else {
            noiseCounter += 1;
        }
        noiseAverage = noiseSum / noiseCounter;

        limit = average - average * tolerance;

        if (analyzed && !request && noiseAverage > limit) {
            request = true;
            console.log('Silence! [noiseAverage: ' + noiseAverage + ', average: ' + average + ', limit: ' + limit + ']');
            elementPeak.innerHTML = 'shhhhh...';
            setupWarn();
            window.setTimeout(forget1, 5000);
            window.setTimeout(forget2, 15000);
            window.setTimeout(forget3, 25000);
            window.setTimeout(clearPeak, waitToAnalyze);
        }

        elementAverage.innerHTML = average;
        // elementMeter.style.width = ( rms * 100 ) + '%';
    };

    function init() {
        collectElements();
        navigator.webkitGetUserMedia({audio: true}, gotStream, function(e) {
            window.alert('Error getting audio');
            console.log(e);
        });
    }

    function collectElements() {
        elementAnalysis = document.getElementById('analysis');
        elementAverage = document.getElementById('average');
        elementBody = document.body;
        elementMeter = document.getElementById('meter');
        elementPeak = document.getElementById('peak');
    }

    function setupWarn() {
        audio = document.createElement('audio');
        audio.src = 'shhhh.mp3';
        audio.autoplay = true;
        elementBody.appendChild(audio);
    }

    function gotStream(stream) {
        // Create an AudioNode from the stream.
        source = ctx.createMediaStreamSource(stream);
        source.connect(processor);

        // this commented line above means no audio playback from microphone
        // source.connect(ctx.destination);

        processor.connect(ctx.destination);
    }

    function forget1() {
        elementPeak.innerHTML = '>[';
    }

    function forget2() {
        elementPeak.innerHTML = ':|';
    }

    function forget3() {
        elementPeak.innerHTML = ':)';
    }

    function clearPeak() {
        request = false;
        audio.pause();
        elementBody.removeChild(audio);
    }

    window.addEventListener('load', init);
}(this, document, this.console));