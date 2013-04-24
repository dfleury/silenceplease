(function(window, document, console){

    var
        analyzed = false,
        analyzingDuration,
        analysisDuration,
        audio,
        averages = [],
        averageRange = 1300, // approximately 1 minute
        chartContext,
        counter = 0,
        ctx = new window.webkitAudioContext(),
        elementBody,
        elementChart,
        elementNoiseRange,
        elementPeak,
        endAnalysis,
        limit,
        noiseAverages = [],
        noiseCounter = 0,
        noiseRange = 23, // approximately 1 second
        noiseSum = 0,
        noiseValues = [],
        processor = ctx.createJavaScriptNode(2048, 1, 1),
        request = false,
        startAnalysis,
        source,
        sum = 0,
        tolerance = 0.10, // twenty percent
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

        // Calculating decibel level
        rms = Math.sqrt( total / len );
        decibel = 20 * (Math.log(rms) / Math.log(10));
        decibel = 100 - (-decibel);

        // Average
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
        }
        average = sum / counter;
        window.lastAverage = average;
        averages.push(average);

        // Average of noise evaluation
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
            }
            noiseSum -= noiseValues.shift();
        } else {
            noiseCounter += 1;
        }
        noiseAverage = noiseSum / noiseCounter;
        noiseAverages.push(noiseAverage);

        limit = average + average * tolerance;

        // Requesting silence
        if (analyzed && !request && noiseAverage > limit) {
            request = true;
            elementPeak.innerHTML = 'shhhhh...';
            setupWarn();
            window.setTimeout(forget1, 5000);
            window.setTimeout(forget2, waitToAnalyze * 0.5);
            window.setTimeout(forget3, waitToAnalyze * 0.9);
            window.setTimeout(clearPeak, waitToAnalyze);
        }
    };

    function init() {
        collectElements();
        navigator.webkitGetUserMedia({audio: true}, gotStream, function(e) {
            window.alert('Error getting audio');
            console.log(e);
        });
    }

    function collectElements() {
        elementBody = document.body;
        elementNoiseRange = document.getElementById('noise-range');
        elementPeak = document.getElementById('peak');
    }

    function setupChart() {
        elementChart = document.createElement('canvas');
        elementChart.height = window.innerHeight;
        elementChart.width = window.innerWidth;
        elementChart.id = 'chart';
        elementBody.appendChild(elementChart);
        chartContext = elementChart.getContext('2d');
        elementNoiseRange.style.right = noiseRange + 'px';
        renderChart();
    }

    function renderChart() {
        var
            bottom,
            c = chartContext,
            canvasHeight = window.innerHeight,
            canvasWidth = window.innerWidth,
            highest,
            highestTolerated,
            limitValue,
            lowest,
            noiseLength,
            noiseValues,
            noiseZero,
            relativeY,
            value,
            values,
            valuesLength,
            x, y,
            zerate,
            highestToleratedAverage,
            highestToleratedNoise;

        if (counter < 2) {
            window.webkitRequestAnimationFrame(renderChart);
            return;
        }

        bottom = canvasHeight;

        averages = averages.slice(-canvasWidth);
        values = averages;
        valuesLength = values.length;

        noiseAverages = noiseAverages.slice(-noiseRange);
        noiseValues = noiseAverages;
        noiseLength = noiseValues.length;

        // Defining lowest and highest
        lowest = values[valuesLength - 1];
        highest = lowest;
        for (x = 0; x < canvasWidth && x < valuesLength; x++) {
            value = values[x];
            lowest = Math.min(value, lowest);
            highest = Math.max(value, highest);
        }

        // Putting the lowest value as zero
        zerate = lowest;
        highestToleratedNoise = highest * (1 + tolerance) - zerate;
        highest = highest - zerate;
        highestToleratedAverage = highest * (1 + tolerance);
        lowest = 0;

        // Time-series of averages
        c.clearRect(0, 0, canvasWidth, canvasHeight);
        c.fillStyle = '#333333';
        c.beginPath();
        c.moveTo(0, canvasHeight);
        for (x = 0; x < canvasWidth && x < valuesLength; x++) {
            value = values[x] - zerate;
            relativeY = value * 100 / highestToleratedAverage;
            y = canvasHeight - relativeY * canvasHeight / 100;
            c.lineTo(x, y);
        }
        c.lineTo(x, bottom);
        c.lineTo(0, bottom);
        c.closePath();
        c.fill();

        noiseZero = canvasWidth - noiseRange;

        // Time-series of noise range
        c.fillStyle = 'rgba(255, 0, 0,0.5)';
        c.beginPath();
        c.moveTo(noiseZero, canvasHeight);
        for (x = 0; x < canvasWidth && x < noiseLength; x++) {
            value = noiseValues[x] - zerate;
            relativeY = value * 100 / highestToleratedNoise;
            y = canvasHeight - relativeY * canvasHeight / 100;
            c.lineTo(noiseZero + x, y);
        }
        c.lineTo(noiseZero + x, bottom);
        c.lineTo(noiseZero, bottom);
        c.closePath();
        c.fill();

        // Limit line
        relativeY = (limit - zerate) * 100 / highestToleratedNoise;
        y = canvasHeight - relativeY * canvasHeight / 100;
        c.strokeStyle = '#FF0000';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(noiseZero, y);
        c.lineTo(canvasWidth, y);
        c.closePath();
        c.stroke();

        window.webkitRequestAnimationFrame(renderChart);
    }

    function gotStream(stream) {
        // Create an AudioNode from the stream.
        source = ctx.createMediaStreamSource(stream);
        source.connect(processor);

        // this commented line above means no audio playback from microphone
        // source.connect(ctx.destination);

        processor.connect(ctx.destination);
        window.setTimeout(setupChart, 1000);
    }

    function setupWarn() {
        audio = document.createElement('audio');
        audio.src = 'shhhh.mp3';
        audio.autoplay = true;
        elementBody.appendChild(audio);
    }

    function forget1() {
        elementPeak.innerHTML = ':(';
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