// color-utils.js
// Shared color math and React app factory for wcolor-matcher and ccolor-matcher.

// ══ HEX ↔ RGB ══════════════════════════════════════════════════
function hexToRgb(hex) {
  var h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function clamp01(n) { return Math.min(1, Math.max(0, n)); }
function clamp255(n) { return Math.min(255, Math.max(0, Math.round(n))); }
function rgbToHex(rgb) {
  return '#' + rgb.map(function(v){
    var s = clamp255(v).toString(16);
    return s.length === 1 ? '0' + s : s;
  }).join('');
}

// ══ Color string parsers ════════════════════════════════════════
function parseHexColor(input) {
  var s = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]+$/.test(s)) return null;
  if (s.length === 3 || s.length === 4) {
    return [
      parseInt(s.charAt(0) + s.charAt(0), 16),
      parseInt(s.charAt(1) + s.charAt(1), 16),
      parseInt(s.charAt(2) + s.charAt(2), 16)
    ];
  }
  if (s.length === 6 || s.length === 8) {
    return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
  }
  return null;
}
function parseHue(s) {
  var v = s.trim().toLowerCase();
  var n = parseFloat(v);
  if (!isFinite(n)) return null;
  if (v.endsWith('turn')) n *= 360;
  else if (v.endsWith('rad')) n *= (180 / Math.PI);
  else if (v.endsWith('grad')) n *= 0.9;
  n = n % 360;
  if (n < 0) n += 360;
  return n;
}
function parseRatio(s) {
  var v = s.trim().toLowerCase();
  var n = parseFloat(v);
  if (!isFinite(n)) return null;
  if (v.endsWith('%') || n > 1) n /= 100;
  return clamp01(n);
}
function hsvToRgb(h, s, v) {
  var c = v * s;
  var x = c * (1 - Math.abs((h / 60) % 2 - 1));
  var m = v - c;
  var rgb1 = [0, 0, 0];
  if (h < 60) rgb1 = [c, x, 0];
  else if (h < 120) rgb1 = [x, c, 0];
  else if (h < 180) rgb1 = [0, c, x];
  else if (h < 240) rgb1 = [0, x, c];
  else if (h < 300) rgb1 = [x, 0, c];
  else rgb1 = [c, 0, x];
  return [(rgb1[0]+m)*255, (rgb1[1]+m)*255, (rgb1[2]+m)*255];
}
function rgbToHsv(rgb) {
  var r = rgb[0]/255, g = rgb[1]/255, b = rgb[2]/255;
  var max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  var h = 0;
  if (d !== 0) {
    if (max === r) h = ((g-b)/d) % 6;
    else if (max === g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d/max, max];
}
function parseHsvColor(input) {
  var m = input.trim().match(/^hs[vb]\((.+)\)$/i);
  if (!m) return null;
  var body = m[1].split('/')[0].replace(/,/g, ' ').trim();
  var p = body.split(/\s+/);
  if (p.length !== 3) return null;
  var h = parseHue(p[0]), s = parseRatio(p[1]), v = parseRatio(p[2]);
  if (h === null || s === null || v === null) return null;
  return rgbToHex(hsvToRgb(h, s, v));
}
var _cssColorProbe = null;
function parseCssColorToHex(input) {
  if (typeof document === 'undefined') return null;
  if (typeof CSS !== 'undefined' && CSS.supports && !CSS.supports('color', input)) return null;
  if (!_cssColorProbe) {
    var canvas = document.createElement('canvas');
    canvas.width = 1; canvas.height = 1;
    _cssColorProbe = canvas.getContext('2d', {willReadFrequently: true});
  }
  if (!_cssColorProbe) return null;
  var ctx = _cssColorProbe;
  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = input;
    ctx.fillRect(0, 0, 1, 1);
    var px = ctx.getImageData(0, 0, 1, 1).data;
    return rgbToHex([px[0], px[1], px[2]]);
  } catch(err) { return null; }
}
function parseOkhclColor(input) {
  var m = input.trim().match(/^okhcl\((.+)\)$/i);
  if (!m) return null;
  return parseCssColorToHex('oklch(' + m[1] + ')');
}
function parseAnyColorToHex(input) {
  var raw = (input || '').trim();
  if (!raw) return null;
  var compactHex = raw;
  if (/^[0-9a-fA-F]{3,8}$/.test(raw) && raw.length !== 5 && raw.length !== 7) compactHex = '#' + raw;
  var hexRgb = parseHexColor(compactHex);
  if (hexRgb) return rgbToHex(hexRgb);
  var hsvHex = parseHsvColor(raw);
  if (hsvHex) return hsvHex;
  var okhclHex = parseOkhclColor(raw);
  if (okhclHex) return okhclHex;
  return parseCssColorToHex(raw);
}
// Handles 'hex', 'rgb', 'hsv', 'oklab', 'oklch', 'okhcl'
function formatAsInputColor(hex, format) {
  var rgb = hexToRgb(hex);
  if (format === 'rgb') return 'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')';
  if (format === 'hsv') {
    var hsv = rgbToHsv(rgb);
    return 'hsv(' + hsv[0].toFixed(2) + ' ' + (hsv[1]*100).toFixed(2) + '% ' + (hsv[2]*100).toFixed(2) + '%)';
  }
  if (format === 'oklab') {
    var lab = rgbToOklab(rgb);
    return 'oklab(' + lab[0].toFixed(4) + ' ' + lab[1].toFixed(4) + ' ' + lab[2].toFixed(4) + ')';
  }
  if (format === 'oklch' || format === 'okhcl') {
    var lch = hexToOklch(hex);
    return format + '(' + lch[0].toFixed(4) + ' ' + lch[1].toFixed(4) + ' ' + lch[2].toFixed(2) + ')';
  }
  return hex.toLowerCase();
}

// ══ OKLCH math ══════════════════════════════════════════════════
function linearize(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function rgbToOklab(rgb) {
  var lr = linearize(rgb[0]), lg = linearize(rgb[1]), lb = linearize(rgb[2]);
  var l = Math.cbrt(0.4122214708*lr + 0.5363325363*lg + 0.0514459929*lb);
  var m = Math.cbrt(0.2119034982*lr + 0.6806995451*lg + 0.1073969566*lb);
  var s = Math.cbrt(0.0883024619*lr + 0.2817188376*lg + 0.6299787005*lb);
  return [
    0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
    1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
    0.0259040371*l + 0.7827717662*m - 0.8086757660*s
  ];
}
function oklabToOklch(lab) {
  var C = Math.sqrt(lab[1]*lab[1] + lab[2]*lab[2]);
  var h = Math.atan2(lab[2], lab[1]) * (180/Math.PI);
  if (h < 0) h += 360;
  return [lab[0], C, h];
}
function hexToOklch(hex) { return oklabToOklch(rgbToOklab(hexToRgb(hex))); }
function fmtOklch(lch) { return 'oklch('+lch[0].toFixed(4)+' '+lch[1].toFixed(4)+' '+lch[2].toFixed(2)+')'; }

// ══ Distance functions ═══════════════════════════════════════════
function deltaOklch(a, b) {
  var dL = a[0]-b[0], dC = a[1]-b[1];
  var dh = a[2]-b[2];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  var rad = Math.PI/180;
  var dH = 2 * Math.sqrt(a[1]*b[1]) * Math.sin((dh/2)*rad);
  return Math.sqrt(dL*dL + dC*dC + dH*dH);
}
function rgbToLab(rgb) {
  var rl = linearize(rgb[0]), gl = linearize(rgb[1]), bl = linearize(rgb[2]);
  var x = (rl*0.4124564 + gl*0.3575761 + bl*0.1804375) / 0.95047;
  var y = (rl*0.2126729 + gl*0.7151522 + bl*0.0721750);
  var z = (rl*0.0193339 + gl*0.1191920 + bl*0.9503041) / 1.08883;
  function f(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787*t + 16/116; }
  return [116*f(y) - 16, 500*(f(x)-f(y)), 200*(f(y)-f(z))];
}
function deltaE2000(lab1, lab2) {
  var L1=lab1[0],a1=lab1[1],b1=lab1[2], L2=lab2[0],a2=lab2[1],b2=lab2[2];
  var rad=Math.PI/180, deg=180/Math.PI;
  var C1=Math.sqrt(a1*a1+b1*b1), C2=Math.sqrt(a2*a2+b2*b2);
  var Cab=(C1+C2)/2, Cab7=Math.pow(Cab,7);
  var G=0.5*(1-Math.sqrt(Cab7/(Cab7+Math.pow(25,7))));
  var a1p=a1*(1+G), a2p=a2*(1+G);
  var C1p=Math.sqrt(a1p*a1p+b1*b1), C2p=Math.sqrt(a2p*a2p+b2*b2);
  var h1p=Math.atan2(b1,a1p)*deg; if(h1p<0) h1p+=360;
  var h2p=Math.atan2(b2,a2p)*deg; if(h2p<0) h2p+=360;
  var dLp=L2-L1, dCp=C2p-C1p;
  var dhp;
  if(C1p*C2p===0) dhp=0;
  else if(Math.abs(h2p-h1p)<=180) dhp=h2p-h1p;
  else if(h2p-h1p>180) dhp=h2p-h1p-360;
  else dhp=h2p-h1p+360;
  var dHp=2*Math.sqrt(C1p*C2p)*Math.sin(dhp/2*rad);
  var Lp=(L1+L2)/2, Cp=(C1p+C2p)/2;
  var hp;
  if(C1p*C2p===0) hp=h1p+h2p;
  else if(Math.abs(h1p-h2p)<=180) hp=(h1p+h2p)/2;
  else if(h1p+h2p<360) hp=(h1p+h2p+360)/2;
  else hp=(h1p+h2p-360)/2;
  var T=1-0.17*Math.cos((hp-30)*rad)+0.24*Math.cos(2*hp*rad)+0.32*Math.cos((3*hp+6)*rad)-0.20*Math.cos((4*hp-63)*rad);
  var SL=1+0.015*(Lp-50)*(Lp-50)/Math.sqrt(20+(Lp-50)*(Lp-50));
  var SC=1+0.045*Cp, SH=1+0.015*Cp*T;
  var Cp7=Math.pow(Cp,7);
  var RT=-2*Math.sqrt(Cp7/(Cp7+Math.pow(25,7)))*Math.sin(60*Math.exp(-((hp-275)/25)*((hp-275)/25))*rad);
  return Math.sqrt((dLp/SL)*(dLp/SL)+(dCp/SC)*(dCp/SC)+(dHp/SH)*(dHp/SH)+RT*(dCp/SC)*(dHp/SH));
}

// ══ Utilities ════════════════════════════════════════════════════
function luminance(hex) {
  var rgb = hexToRgb(hex);
  return 0.2126*linearize(rgb[0]) + 0.7152*linearize(rgb[1]) + 0.0722*linearize(rgb[2]);
}
function txtCol(hex) { return luminance(hex) > 0.35 ? '#1a1a1a' : '#f5f5f5'; }

// ══ App factory ══════════════════════════════════════════════════
// W        — array of [name, reading, hex] (the color dataset)
// baseHexes — array of hex strings for initial color picker presets
// formats   — array of format strings for random color input display
// config    — { fallbackHex, defaultTopN, topNOptions, nameFont, isExactFn, footerNodes(e) }
function makeColorMatcherApp(W, baseHexes, formats, config) {
  var COLORS = W.map(function(c) {
    return {name:c[0], reading:c[1], hex:c[2], oklch:hexToOklch(c[2]), lab:rgbToLab(hexToRgb(c[2]))};
  });

  var _fallback = config.fallbackHex || baseHexes[0] || '#4c6473';
  var INITIAL_INPUTS = baseHexes.map(function(hex) {
    var fmt = formats[Math.floor(Math.random() * formats.length)];
    var s = formatAsInputColor(hex, fmt);
    return parseAnyColorToHex(s) ? s : hex.toLowerCase();
  });

  function pickPreset() {
    var a = INITIAL_INPUTS.slice();
    for (var i = a.length-1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i+1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    var text = a[0] || _fallback;
    return {text: text, hex: parseAnyColorToHex(text) || _fallback};
  }

  var _initPreset = pickPreset();
  var e = React.createElement;
  var _defaultTopN  = config.defaultTopN  || 7;
  var _topNOptions  = config.topNOptions  || [7, 13, 33, 56];
  var _nameFont     = config.nameFont     || 'serif';
  var _isExactFn    = config.isExactFn    || function(c) { return c.dL === 0 && c.dC === 0 && c.dH === 0; };
  var _footerNodes  = config.footerNodes  || function(e) { return []; };
  var _bL = 0.72, _bC = 0.64, _bH = 0.86;

  function App() {
    var _ih = React.useState(_initPreset.hex);
    var inputHex = _ih[0], setInputHex = _ih[1];
    var _ti = React.useState(_initPreset.text);
    var textInput = _ti[0], setTextInput = _ti[1];
    var _tn = React.useState(_defaultTopN);
    var topN = _tn[0], setTopN = _tn[1];
    var _bi = React.useState('default');
    var bias = _bi[0], setBias = _bi[1];
    var pickerRef = React.useRef(null);

    var results = React.useMemo(function() {
      var targetLab = rgbToLab(hexToRgb(inputHex));
      var targetOklch = hexToOklch(inputHex);
      return COLORS.map(function(c) {
        var dL = targetOklch[0] - c.oklch[0];
        var dC = targetOklch[1] - c.oklch[1];
        var dH = targetOklch[2] - c.oklch[2];
        if (dH > 180) dH -= 360;
        if (dH < -180) dH += 360;
        // 把兩個距離歸一化到相近尺度後混合
        // OKLCH 距離 ×100 ≈ CIEDE2000 的數量級
        var dE = deltaE2000(targetLab, c.lab);
        var dO = deltaOklch(targetOklch, c.oklch) * 100;
        // 目標色的 L 越高、C 越低，越偏向信任 OKLCH
        var tL = targetOklch[0], tC = targetOklch[1];
        var w = Math.max(0, Math.min(1, 0.5 + 0.4*(tL-0.5) - 1.5*tC));
        var dist_default = dE*(1-w) + dO*w;
        var dist;
        if (bias === 'dL')      dist = (1-_bL)*dist_default + _bL*Math.abs(dL)*100;
        else if (bias === 'dC') dist = (1-_bC)*dist_default + _bC*Math.abs(dC)*250;
        else if (bias === 'dH') dist = (1-_bH)*dist_default + _bH*Math.abs(dH)/1.8;
        else                    dist = dist_default;
        return Object.assign({}, c, {dist:dist, dL:dL, dC:dC, dH:dH});
      })
      .sort(function(a,b){ return a.dist-b.dist; })
      .slice(0, topN);
    }, [inputHex, topN, bias]);

    function handleText(ev) {
      var v = ev.target.value;
      setTextInput(v);
      var p = parseAnyColorToHex(v);
      if (p) setInputHex(p);
    }
    function handlePicker(ev) { setInputHex(ev.target.value); setTextInput(ev.target.value); }
    function openPickerAtCursor(ev) {
      if (ev.target && ev.target.closest && ev.target.closest('[data-no-picker="true"]')) return;
      var input = pickerRef.current;
      if (!input) return;
      var rect = ev.currentTarget.getBoundingClientRect();
      input.style.left = (ev.clientX - rect.left) + 'px';
      input.style.top  = (ev.clientY - rect.top)  + 'px';
      if (typeof input.showPicker === 'function') input.showPicker();
      else input.click();
    }

    var inputFmt    = fmtOklch(hexToOklch(inputHex));
    var inputTxtCol = txtCol(inputHex);

    return e('div', {style:{maxWidth:960,margin:'0 auto',padding:'12px 0px 0'}},

      e('div', {className:'wm-input-panel',
        style:{position:'relative',background:inputHex,borderRadius:4,height:'var(--wm-preview-h, 96px)',
          marginBottom:16,boxShadow:'0 4px 8px 4px oklch(0.492 0.0222 214.1 / 0.16)',cursor:'pointer'},
        onClick:openPickerAtCursor},
        e('input', {ref:pickerRef,type:'color',value:inputHex,onChange:handlePicker,
          tabIndex:-1,'aria-hidden':true,
          style:{position:'absolute',top:0,left:0,width:1,height:1,
            transform:'translate(-50%, -50%)',opacity:0,pointerEvents:'none',zIndex:1}}),
        e('div', {className:'wm-controls',
          style:{position:'absolute',inset:0,zIndex:2,pointerEvents:'none'}},
          e('input', {className:'wm-color-text',type:'text',value:textInput,onChange:handleText,
            placeholder:'hex/rgb/hsv/lab/lch',spellCheck:false,'data-no-picker':'true',
            style:{fontSize:18,fontFamily:"'Berkeley Mono','Fira Code',monospace",fontWeight:600,
              textAlign:'center',padding:'6px 8px',background:'transparent',border:'none',
              borderBottom:'2px solid '+inputTxtCol+'80',borderRadius:2,outline:'none',
              color:inputTxtCol,pointerEvents:'auto',marginBottom:'0'}}),
          e('div', {className:'wm-top-controls',
            style:{display:'flex',alignItems:'center',gap:8,fontSize:18,color:inputTxtCol,pointerEvents:'auto'}},
            e('span', null, 'Top'),
            e('select', {value:topN,onChange:function(ev){setTopN(Number(ev.target.value));},'data-no-picker':'true',
              style:{fontSize:18,textAlign:'center',padding:'4px 8px',borderRadius:2,border:'none',
                borderBottom:'2px solid '+inputTxtCol+'80',outline:'none',cursor:'pointer',
                background:'transparent',color:inputTxtCol,marginBottom:'0'}},
              _topNOptions.map(function(n){ return e('option',{key:n,value:n},n); })
            ),
            e('span', null, '偏向'),
            e('select', {value:bias,onChange:function(ev){setBias(ev.target.value);},'data-no-picker':'true',
              style:{fontSize:18,textAlign:'center',padding:'4px 8px',borderRadius:2,border:'none',
                borderBottom:'2px solid '+inputTxtCol+'80',outline:'none',cursor:'pointer',
                background:'transparent',color:inputTxtCol,marginBottom:'0'}},
              e('option',{value:'default'},'基本'),
              e('option',{value:'dH'},'\u0394H'),
              e('option',{value:'dC'},'\u0394C'),
              e('option',{value:'dL'},'\u0394L')
            )
          )
        )
      ),

      e('div', {style:{display:'flex',flexDirection:'column',gap:8}},
        results.map(function(c, i) {
          var isExact    = _isExactFn(c);
          var rowGradient = 'linear-gradient(78deg in oklch shorter hue, '+fmtOklch(c.oklch)+' 0%, 56%, '+inputFmt+' 100%)';
          var rowTxtCol  = txtCol(c.hex);
          return e('div', {key:i, style:{display:'flex',alignItems:'stretch',borderRadius:4,overflow:'hidden',background:c.hex}},
            e('div', {style:{width:48,minHeight:56,background:c.hex,flexShrink:0,
              display:'flex',alignItems:'center',justifyContent:'center'}},
              e('span', {style:{color:rowTxtCol,fontSize:16,fontWeight:600,opacity:0.87}}, i+1)
            ),
            e('div', {style:{flex:1,padding:'8px 8px 8px 2px',display:'flex',alignItems:'center',gap:10,color:rowTxtCol,background:rowGradient}},
              e('div', {style:{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',gap:2}},
                e('div', {style:{display:'flex',alignItems:'baseline',gap:12}},
                  e('span', {style:{fontSize:20,fontFamily:_nameFont,fontWeight:600}}, c.name),
                  e('span', {style:{fontSize:14,color:'inherit',opacity:0.87}}, c.reading)
                ),
                e('div', {style:{display:'flex',alignItems:'center',gap:10,fontSize:14}},
                  e('span', {style:{fontFamily:"'Berkeley Mono','Fira Code',monospace",color:'inherit',opacity:0.96,fontWeight:600}}, c.hex),
                  e('div', {style:{display:'flex',alignItems:'center',gap:5,
                    fontFamily:"'Berkeley Mono','Fira Code',monospace",fontSize:12,fontWeight:600,
                    background:rowTxtCol==='#f5f5f5'?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.12)',
                    padding:'2px 8px',borderRadius:4}},
                    e('span',null,'\u0394L\u202f'+(c.dL>=0?'+':'')+c.dL.toFixed(3)),
                    e('span',{style:{opacity:0.35}},'\u00b7'),
                    e('span',null,'\u0394C\u202f'+(c.dC>=0?'+':'')+c.dC.toFixed(3)),
                    e('span',{style:{opacity:0.35}},'\u00b7'),
                    e('span',null,'\u0394H\u202f'+(c.dH>=0?'+':'')+c.dH.toFixed(1)+'\u00b0')
                  )
                )
              ),
              isExact ? e('span',{style:{fontSize:12,color:rowTxtCol,fontWeight:600,alignSelf:'center',
                writingMode:'vertical-rl',textOrientation:'upright',lineHeight:1.05,letterSpacing:'0.08em'}},'完全一致') : null
            )
          );
        })
      ),

      // Footer — children injected by caller
      React.createElement.apply(React,
        ['div', {style:{marginTop:20,padding:'12px 16px',background:'#fefefe',borderRadius:4,
          fontSize:14,fontFamily:"'Berkeley Mono','Fira Code',monospace",color:'#333',lineHeight:1.5}}
        ].concat(_footerNodes(e))
      )
    );
  }

  return App;
}
