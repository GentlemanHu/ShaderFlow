/*
// (c) CC BY-SA 4.0, Tremeschin
*/

#define WHITE_COLOR vec3(0.9)
#define BLACK_COLOR vec3(0.2)

#define TOP_BORDER 0.03

// Black keys have a constant index relative to the octave
bool isBlackKey(int index) {
    int key = index % 12;
    return key==1||key==3||key==6||key==8||key==10;
}

// Can only be black or white
bool isWhiteKey(int index) {
    return !isBlackKey(index);
}

// Channel colors definitions for keys and notes
vec3 getChannelColor(int channel) {
    vec3 color = vec3(0.5);
    float x = astuv.x*0.7;
    float y = astuv.y*0.7;
         if (channel == 0) {color = vec3(0, 1, y);}
    else if (channel == 1) {color = vec3(1, y, 0);}
    else if (channel == 2) {color = vec3(y, 0.5, 1);}
    else if (channel == 3) {color = vec3(1, 1, 0);}
    else if (channel == 4) {color = vec3(1, 0, 1);}
    else if (channel == 5) {color = vec3(0, 1, 1);}
    else if (channel == 6) {color = vec3(1, 1, 1);}
    // color.rg += vec2(astuv);
    return color;
}

// Get color of a piano key by index
vec3 getKeyColor(int index) {
    if (isWhiteKey(index)) {
        return WHITE_COLOR;
    } else {
        return BLACK_COLOR;
    }
}

// Divisors shenanigans
struct Segment {
    int   A;
    float Ax;
    int   B;
    float Bx;
};

// X: (0 - 1), A: 1-oo, B: 1-oo
Segment makeSegment(float x, int a, int b, int offset) {
    Segment S;
    S.A  = offset + int(a*x);
    S.Ax = fract(a*x);
    S.B  = offset + int(b*x)*2;
    S.Bx = fract(b*x);
    return S;
}

void main() {
    fragColor = vec4(vec3(0.2), 1);
    vec2 uv   = iCamera.astuv;

    // Calculate indices and coordinates
    float iPianoMin = (iPianoDynamic.x - iPianoExtra);
    float iPianoMax = (iPianoDynamic.y + iPianoExtra);
    float octave    = abs(mix(iPianoMin, iPianoMax, uv.x))/12;
    float nkeys     = abs(iPianoMax - iPianoMin);
    float whiteSize = 1/( 7*(nkeys/12));
    float blackSize = 1/(12*(nkeys/12));
    Segment segment;

    /* Ugly calculate segments */ {
        float divisor  = (3.0/7.0);
        bool  first    = fract(octave) < divisor;
        int   offset   = 12*int(octave) + (first?0:5);
        float segmentX = first ? (fract(octave)/divisor) : (fract(octave)-divisor)/(1.0-divisor);
        segment = makeSegment(segmentX, (first?5:7), (first?3:4), offset);

        // Make lines based on start and end of segmentX
        fragColor.rgb += 0.1*pow(abs(segmentX*2 - 1), 100);
    }

    // Get properties
    int   rollIndex   = segment.A;
    int   whiteIndex  = segment.B;
    float rollX       = segment.Ax;
    float whiteX      = segment.Bx;
    float blackHeight = iPianoHeight*(1 - iPianoBlackRatio);
    int   index       = rollIndex;
    vec2  keyStuv;

    // Inside the piano keys and black key
    if (isWhiteKey(rollIndex) || (uv.y < blackHeight) || (uv.y > iPianoHeight)) {
        keyStuv = vec2(whiteX, uv.y/iPianoHeight);
        index   = whiteIndex;
    } else {
        keyStuv = vec2(rollX, (uv.y - blackHeight)/(iPianoHeight - blackHeight));
        index   = rollIndex;
    }

    // Get note propertikes
    bool black        = isBlackKey(index);
    bool white        = isWhiteKey(index);
    int  channel      = int(texelFetch(iPianoChan, ivec2(index, 0), 0).r);
    vec3 channelColor = getChannelColor(channel);
    vec3 keyColor     = getKeyColor(index);
    vec2 keyGluv      = stuv2gluv(keyStuv);

    // Inside the piano keys
    if (uv.y < iPianoHeight) {
        float press   = (texelFetch(iPianoKeys, ivec2(index, 0), 0).r)/128;
        fragColor.rgb = (channel==-1)?keyColor:mix(keyColor, channelColor, pow(abs(press), 0.5));

        float dark = mix(1, 0.5, press) * (black?0.6:0.8);
        float down = mix(0.11, 0, press); // Key perspective

        if (keyStuv.y < down+iPianoHeight*0.05) {
            fragColor.rgb *= dark;
        }

        // Separation lines
        fragColor.rgb *= 0.7 + 0.3*pow(1 - abs(keyGluv.x), 0.1);
        fragColor.rgb *= pow(1 - 0.7*press*(uv.y/iPianoHeight), 1.4); // Fade to Black

        // Top border
        float topBorder = iPianoHeight*(1 - TOP_BORDER);
        if (uv.y > topBorder) {
            vec2 uv = vec2(uv.x, lerp(topBorder, -1, iPianoHeight, 1, uv.y));
            fragColor.rgb = vec3(232, 7, 0)/255;
            fragColor.rgb *= 1 - 0.6*pow(length(uv.y), 1);
        }

    // Inside the 'Roll'
    } else {

        // Piano roll canvas coordinate (-1 to 1)
        vec2 roll = vec2(uv.x, lerp(iPianoHeight, 0, 1, 1, uv.y));

        // Draw the white key then black key
        for (int layer=0; layer<2; layer++) {

            // Skip drawing a duplicate black on top of white
            if ((layer == 1) && isWhiteKey(rollIndex)) {continue;}

            // Get the index we are matching depending on the pass
            int thisIndex = int(mix(whiteIndex, rollIndex, float(layer)));

            // Search for playing notes: (Start, End, Channel, Velocity)
            for (int i=0; i<iPianoLimit; i++) {
                vec4 note = texelFetch(iPianoRoll, ivec2(thisIndex, i), 0);
                if (note.w < 1) break;

                // Local coordinate for the note
                vec2 nagluv = vec2(
                    mix(whiteX, rollX, float(layer))*2-1,
                    lerp(note.x, -1, note.y, 1, iTime+iPianoRollTime*roll.y)
                );

                // Check if we are inside the note
                if (abs(nagluv.y) < 1 && abs(nagluv.x) < 1) {
                    float velocity  = int(note.w);
                    float duration  = abs(note.y - note.x);
                    float thisSizeX = mix(whiteSize, blackSize, float(layer));
                    float thisSizeY = (duration/iPianoRollTime)*(1-iPianoHeight)/iAspectRatio;
                    bool  thisBlack = isBlackKey(thisIndex);
                    vec3  thisColor = getChannelColor(int(note.z));

                    // "Real" scene distances. This wasn't fun to code.
                    vec2 real = vec2(
                        lerp(0, (1-thisSizeX/2), 1, 1, abs(nagluv.x)),
                        lerp(0, (1-thisSizeY/2), 1, 1, abs(nagluv.y))
                    );

                    // Minimum and maximum distances to the borders
                    vec2 dist = vec2(1 - max(real.x, real.y), 1 - min(real.x, real.y));
                    vec3 color = thisColor;

                    // Round shadows "as borders"
                    float border = 0.003;
                    color *= smoothstep(1, 1-border, real.x) * smoothstep(1, 1-border, real.y);

                    // Darker smoothstep on the shadow
                    if (dist.x < border) {color *= thisBlack?0.5:0.3;}
                    if (thisBlack) {color *= 0.4;}
                    fragColor.rgb += color;
                }
            }
        }
    }

    // // Post Effects

    // Vignette
    vec2 vig = astuv * (1 - astuv.yx);
    fragColor.rgb *= pow(vig.x*vig.y * 10, 0.05);
    fragColor.a = 1;

    // Progress bar
    if (uv.y > 0.99 && uv.x < iTau) {
        fragColor.rgb *= 0.8 - 0.2 * smoothstep(0, 1, uv.x);
    }

    // Fade in/out
    float fade = 3;
    if (iRendering) {
        fragColor.rgb *= mix(0.5, 1, smoothstep(0, fade, iTime));
        fragColor.rgb *= mix(1, 0, smoothstep(iTimeEnd - fade, iTimeEnd, iTime));
    }

    return;
}