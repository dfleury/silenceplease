Silence please
==============

This is a HTML5 application to help coworkers to speak lower.

Only tested on Chrome, you need to activate the "Web Audio Input" setting on chrome://flags/

1. git clone git://github.com/dfleury/silenceplease.git
2. chmod +x run.sh
3. ./run.sh
4. Open in the chrome http://localhost:8831/

It takes 60 seconds to define the average noise in your environment and request silence when the noise pass over in more of 20% of the average.

This average is continuously recalculated in function of the noise variation.

After a warning, it waits 10 minutes to the next analysis of noise.

Creative Commons license OK!? **Be free to use, improve and share! =)**