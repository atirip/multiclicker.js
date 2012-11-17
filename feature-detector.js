/*jshint laxcomma:true, laxbreak: true, asi:true */
/*
* MIT Licensed
* Copyright (c) 2012, Priit Pirita, atirip@yahoo.com
* https://github.com/atirip/mover.js
*/

;(function(window, APP) {

//	var vendors = ['Moz','Khtml','Webkit','O','ms']
// currently, as of writing ms does not support TransitionEnd on CSS transitions and Opera is buggy

	var vendors = ['Moz', 'Webkit']
	,	div = document.createElement('div')

	// thx Modernizr
	,	getVendor = function(prop) {
			var upper = prop.charAt(0).toUpperCase() + prop.slice(1)
			,	len

			if (prop in div.style) return ''

			for (len = vendors.length; len--; ) {
				if ((vendors[len] + upper) in div.style) {
					return (vendors[len])
				}
			}
			return false
		}

	,	jsVendor = getVendor('Transform') // for Javascript
	/*
	,	checkTransform3dSupport = function() {
			div.style[jsVendor + 'Transform'] = 'rotateY(90deg)'
			return div.style[jsVendor + 'Transform'] !== ''
		}
	*/
	,	is = {
			standalone: navigator.standalone,
			android: /android \d+\.\d+/i.test(navigator.appVersion),
			winMobile: /iemobile|windows phone/i.test(navigator.appVersion),
			ios: /iphone|ipad|ipod/i.test(navigator.appVersion),
			iphone: /iphone|ipod/i.test(navigator.appVersion),
			webkit: ('webkitTransform' in document.documentElement.style),
			retina: window.devicePixelRatio >= 2
		}

	,	has = {
			rotateY: !is.android,
			/*rotateY: checkTransform3dSupport(),*/
			threeD: 'WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix,
			touch: 'ontouchstart' in window,
			transform: jsVendor === false ? false : true,
			pointer: !!navigator.msPointerEnabled
		}

	,	events = {
			start: has.pointer ? "MSPointerDown" : has.touch ? 'touchstart' : 'mousedown',
			move: has.pointer ? "MSPointerMove" : has.touch ? 'touchmove' : 'mousemove',
			end: has.pointer ? "MSPointerUp" : has.touch ? 'touchend' : 'mouseup',
			resize: 'onorientationchange' in window ? 'orientationchange' : 'resize',
			cancel: has.pointer ? "MSPointerUp": has.touch ? 'touchcancel' : 'mouseup',
			out: has.pointer ? "MSPointerOut" : "mouseout"
		}

	,	translate = function(x, y) {
			return ('translate' + (has.threeD ? '3d(' : '(')) + (x||0) + ',' + (y||0) + (has.threeD ? ',0)' : ')')
		}

	,	transitionEnd

	switch (jsVendor) {
		case 'Moz':
			transitionEnd = 'transitionend'
			break

		case '':
			transitionEnd = 'transitionEnd'
			break

		case 'ms':
			transitionEnd = 'MSTransitionEnd'
			break

		case false:
			jsVendor = '' // from now, false is not expected
			break

		default:
			transitionEnd = jsVendor.toLowerCase() + 'TransitionEnd'
	}

	// HAS means if we have touch events, IS means if we have touch device
	is.touch = has.touch || is.winMobile
	is.mobile = is.ios || is.android || is.winMobile


	// export
	APP.is = is
	APP.has = has
	APP.events = events
	APP.jsVendor = jsVendor
	APP.cssVendor = jsVendor.length ? '-' + jsVendor.toLowerCase() + '-' : '' // in lowercase, for CSS
	APP.transitionEnd = transitionEnd
	APP.translate = translate

})(window, (window.atirip || (window.atirip = {}) ));



