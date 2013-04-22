(function(){

    var ctx = new webkitAudioContext(),
        processor = ctx.createJavaScriptNode(2048, 1, 1),
        meter = document.getElementById('meter'),
        media = document.getElementById('media'),
        pico = document.getElementById('pico'),
        analysis = document.getElementById('analysis'),
        source,
        counter = 0,
        values = [],
        sum = 0,
        average,
        noiseCounter = 0,
        noiseSum = 0,
        noiseValues = [],
        noiseAverage,
        warningTimer,
        analyzed = false,
        analyzingDuration,
        analyzisDuration,
        audio,
        request = false;

    function gotStream(stream) {
        // Create an AudioNode from the stream.
        source = ctx.createMediaStreamSource(stream);
        source.connect(processor);
        // source.connect(ctx.destination);
        processor.connect(ctx.destination);
    }

    // loop through PCM data and calculate average
    // volume for a given 2048 sample buffer
    processor.onaudioprocess = function(evt){
        var input = evt.inputBuffer.getChannelData(0),
            len = input.length,
            total = 0,
            i = total,
            rms,
            decibel;

        while ( i < len ) {
            total += Math.abs( input[i++] );
        }
        rms = Math.sqrt( total / len );
        decibel = 20 * (Math.log(rms) / Math.log(10));

        values.push(decibel);
        sum += decibel;
        if (counter === 1000) {
          sum -= values.shift();
          if (!analyzed) {
              analyzed = true;
              pico.innerHTML = 'READY';
          }
        } else {
          counter += 1;
            analysis.style.width = '' + (counter * 100 / 1000) + '%';
        }
        average = sum / counter;

        noiseValues.push(decibel);
        noiseSum += decibel;
        if (analyzingDuration === undefined) {
          analyzingDuration = false;
          start = new Date();
        }
        if (noiseCounter === 100) {
          if (analyzingDuration === false) {
            analyzingDuration = true;
            end = new Date();
            analyzisDuration = end.getTime() - start.getTime();
            console.log('Data length: ' + analyzisDuration + 'ms');
          }
          noiseSum -= noiseValues.shift();
        } else {
          noiseCounter += 1;
        }
        noiseAverage = noiseSum / noiseCounter;

        if (analyzed && noiseAverage > average - average * 0.20) {
            if (!request) {
                request = true;
                console.log('Silence! (', noiseAverage, ')');
                pico.innerHTML = 'SILENCE!';
                audio = document.createElement('audio');
                audio.src = 'Voice_003.mp3';
                audio.autoplay = true;
                document.body.appendChild(audio);
                warningTimer = setTimeout(clearPico, analyzisDuration * 2);
          }
        }

        media.innerHTML = average;
        meter.style.width = ( rms * 100 ) + '%';
    };

    function clearPico() {
      request = false;
      pico.innerHTML = 'd-_-b';
      audio.pause();
      document.body.removeChild(audio);
    }

    function initAudio() {
        navigator.webkitGetUserMedia({audio:true}, gotStream, function(e) {
            alert('Error getting audio');
            console.log(e);
        });
    }

    window.addEventListener('load', initAudio );
})();