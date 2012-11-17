/*jshint laxcomma:true, laxbreak: true, asi:true */
/*
* MIT Licensed
* Copyright (c) 2012, Priit Pirita, atirip@yahoo.com
* https://github.com/atirip/multiclicker.js
*/

;(function(window, APP) {

	var	doc = window.document
	,	html = doc.documentElement
	,	body = doc.body
	,	multiclicker = function (el, options) {
			var self = this

			// recommended to set to 1000 for hold support
			this.holdDelay = 0

			this.clickDelay = 300
			// whether to handle doubleclicks
			this.doubleClick = false
			// whether to throttle click event firing, if true, then throttle with clickDelay
			this.throttleClick = true
			// whether to fire mouseovers
			this.fireOver = true
			// callback on custom event fire
			this.callback = function(type, event, data) {}
			// callback call context
			this.context = window
			//
			this.onclick = undefined
			// click's at passthru tags are ignored and not processed
			this.clickPassthruTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']
			// distance dragged before hold canceled or drag initalised
			this.distance = Math.pow( APP.is.touch ? 10: 5, 2 )
			// whether to capture eevents
			this.capture = false
			// android hack needed
			this.androidPreventStart = true
			// whether to handle mouse events when modifier key (shift, alt, ctrl, meta) is pressed
			this.handleModifierEvents = false
			
			options = options || {}
			for ( var name in options) if( options.hasOwnProperty(name) )
				this[name] = options[name]

			this.clickDelay = this.doubleClick ? this.clickDelay : 5
			this.clickPassthruLength = this.clickPassthruTags.length

			this.iehandler = function() {
				self.handleEvent.call(self)
			}

			this.bind(APP.events.start, el)
			if ( !document.addEventListener ) {
				// IE, have no idea why i need to do this 
				this.bind(APP.events.end, el)
			}

			this.bind("gesturestart", el)
			this.bind("click", el)
			this.bind("dblclick", el)
			if ( !APP.is.touch ) {
				this.bind("DOMMouseScroll", el)
				this.bind("mousewheel", el)
			}
		}

	multiclicker.prototype = {
		// 'local' variables are defined here
		startX: 0
	,	startY: 0
	,	pageX: 0
	,	pageY: 0
	,	fingers: 0
	,	moved: false
	,	started: false
	,	changed: false
	,	holdTimer: false
	,	holdFired: false
	,	clickTimer: false
	,	gesture: false
	,	squared: function(val) { return Math.pow(val, 2 ) }

	,	bind: function(type, element) {
			element = element || doc
			if ( element.addEventListener ) {
				element.addEventListener( type, this, this.capture)
			} else if( element.attachEvent ) {
				element.attachEvent('on' + type, this.iehandler)
			}
		}
	
	,	unbind: function(type, element) {
			element = element || doc
			if ( element.removeEventListener ) {
				element.removeEventListener(type, this, this.capture)
			} else if( element.detachEvent ) {
				element.detachEvent('on' + type, this.iehandler)
			}
		}

	,	stopPropagation:function(event) {
			if ( event.stopPropagation) 
				event.stopPropagation()
			else if (window.event) 
				window.event.cancelBubble = true
		}

	,	preventDefault:function(event) {
			if ( event.preventDefault) 
				event.preventDefault()
			else if (window.event) 
				window.event.returnValue = false
		}

	,	fire: function(type, event, target) {
			this.modifier && this.handleModifierEvents && (
				(event.ctrlKey && (this.modifier = 17)) ||
				(event.shiftKey && (this.modifier = 16)) ||
				(event.altKey && (this.modifier = 18)) ||
				(event.metaKey && (this.modifier = 91)) ||
				(this.modifier = event.which)
			)

			return this.callback.call(this.context, type, event, {
				// normalized event targets
				// on iOS on drag target is always the original element
				// on mousedrag target is element mouse hovers
				originalTarget: this.originalTarget,
				currentTarget: this.currentTarget,
				// as we handle ouver & out, lastTarget is target previously over, but now is out
				lastTarget: target ? target : this.currentTarget,

				// drag direction, boolean
				horizontal : this.horizontal,
				vertical : !this.horizontal,

				// coordinates where we initiated dragging
				x : this.startX,
				y : this.startY,

				// current coordinates
				px: this.pageX,
				py:	this.pageY,

				// delta dragged
				dx: this.pageX - this.startX,
				dy:	this.pageY - this.startY,

				// previous delta, e.g. delta between coordinates in this and previous event fired
				ddx: this.pageX - this.prevX,
				ddy: this.pageY	- this.prevY,

				// drag direction, boolean
				left : this.horizontal ? this.left : false,
				right : this.horizontal ? !this.left: false,
				up: !this.horizontal ? this.left: false,
				down: !this.horizontal ? !this.left: false,

				// whether modifier pressed
				modifier: this.modifier
			}, this)
		}

	,	clearTimer: function(t) {
			clearTimeout(t)
			return false
		}

	// get current coordinates
	,	getXY: function(e, x, y) {
			if (e.changedTouches && e.changedTouches.length > 0) {
				this[x] = e.changedTouches[0].pageX
				this[y] = e.changedTouches[0].pageY
			} else if (e.targetTouches && e.targetTouches.length > 0) {
				this[x] = e.targetTouches[0].pageX
				this[y] = e.targetTouches[0].pageY
			} else if (e.pageX || e.pageY) {
				this[x] = e.pageX
				this[y] = e.pageY
			} else if (e.clientX || e.clientY) {
				this[x] = e.clientX + body.scrollLeft + html.scrollLeft
				this[y] = e.clientY + body.scrollTop + html.scrollTop
			}
		}

	,	ignore: function(event) {
			var len = this.clickPassthruLength
			for(; len--;) if ( event.target.tagName === this.clickPassthruTags[len] )
				return true
			return false
		}

	// here magic happens
	,	handleEvent: function (event) {
			var self = this
			,	delta = 0
			,	target
		
			event = event || window.event

			// fixes borrowed from jQuery
			if ( null === event.which ) {
				event.which = event.charCode !== null ? event.charCode : event.keyCode
			}
			if ( !event.target ) {
				event.target = event.srcElement || doc
			}
			if ( event.target.nodeType === 3 ) {
				event.target = event.target.parentNode
			}
			if ( !event.relatedTarget && event.fromElement ) {
				event.relatedTarget = event.fromElement === event.target ? event.toElement : event.fromElement
			}

			switch (event.type) {

				case 'DOMMouseScroll':
				case 'mousewheel':

					// Old school scrollwheel delta
					event.wheelDelta && (delta = event.wheelDelta / 120)
					event.detail && (delta = -event.detail / 3)
					
					this.startY = delta
					this.startX = 0
					
					// Gecko
					if ( event.axis !== undefined && event.axis === event.HORIZONTAL_AXIS ) {
						this.startY = 0
						this.startX = -1 * delta
					}
					// Webkit
					undefined !== event.wheelDeltaY && (this.startY = event.wheelDeltaY / 120 )
					undefined !== event.wheelDeltaX && (this.startX = -1 * event.wheelDeltaX / 120 )
		
					this.originalTarget = this.currentTarget = event.target
					this.horizontal = !!this.startX
					this.left = this.horizontal ? this.startX > 0 : this.startY < 0
					this.fire("wheel", event)
					break

				case 'gesturestart':
					if ( !this.gesture ) {
						this.bind("gesturechange")
						this.bind("gestureend")
						this.gesture = true
						this.changed = false
					}
					break
					
				case 'gesturechange':
					this.changed = true
					break
					
				case 'gestureend':
					if ( this.gesture ) {
						this.unbind("gesturechange")
						this.unbind("gestureend")
						this.gesture = false
						if ( !this.changed ) {
							this.fire("twofingertap", event)
							this.fire("stop", event)
						}
					}
					break

				case 'dblclick':
					if ( this.ignore(event) ) break
					// not interested under any circumstances
					this.preventDefault(event)
					this.stopPropagation(event)
					break

				case 'click':
					if ( this.onclick && !this.modifier) {
						if ( this.ignore(event) ) break
						// handler set, kill them here
						this.preventDefault(event)
						this.stopPropagation(event)
					}
					break
				
				case APP.events.start:
					if ( this.ignore(event) ) break

					this.stopPropagation(event)

					if ( this.androidPreventStart && APP.is.android ) {
						event.preventDefault()
					}

					if ( this.started ) {
						return false
					}
					
					this.fingers = event.touches ? event.touches.length : 1

					if ( this.fingers > 1 ) {
						// tear it all down, we have a gesture
						if ( this.holdTimer || this.clickTimer) {
							this.holdTimer = this.clearTimer( this.holdTimer )
							this.clickTimer = this.clearTimer( this.clickTimer )
						}
						return false
					}

					this.modifier = 16 === event.which || 17 === event.which || 18 === event.which || 91 === event.which || event.ctrlKey || event.shiftKey || event.altKey || event.metaKey

					// if right click, ignore
					if ( !APP.is.touch ) {
						var rightclick
						if (event.which) {
							rightclick = (event.which == 3)
						} else if (event.button) {
							rightclick = (event.button == 2)
						}
						if (rightclick) {
							break
						}
					}
					this.getXY(event, 'startX', 'startY')
					this.originalTarget = this.currentTarget = event.target
					this.horizontal = false
					this.left = false
					this.bind(APP.events.move)
					document.addEventListener && this.bind(APP.events.end)
					this.started = true
					this.holdFired = false
					this.moved = false
					this.dragged = false

					// set up hold support
					if ( this.holdDelay ) {
						this.holdTimer = setTimeout( function() {
							self.holdFired = true
							self.holdTimer = false
							/*1 == self.fingers  && */ self.fire("hold", event)
						}, this.holdDelay)
					}

					!this.clickTimer && this.fire("start", event)
					break
							
				case APP.events.move:
					this.getXY(event, 'pageX', 'pageY')

					if ( this.moved ) {
						this.dragged && this.fire("drag", event)
						if ( this.fireOver ) {
							// if you drag something then you are interested on element below
							// when browser supports pointerEvents, you should set it to none on draggable
							// this way elementFromPoint
							target = doc.elementFromPoint(this.pageX, this.pageY)
							if ( target && this.currentTarget != target ) {
								this.fire("out", event, this.currentTarget)
								this.currentTarget = target
								this.fire("over", event)
							}
						}

					} else if ( !this.gesture && this.squared( this.pageX-this.startX )  + this.squared( this.pageY-this.startY ) > this.distance  ) {
						this.holdTimer = this.clearTimer( this.holdTimer )
						this.horizontal = this.squared( this.pageX-this.startX ) > this.squared( this.pageY-this.startY )
						this.left = this.horizontal ? this.pageX < this.startX : this.pageY < this.startY
						this.fire("over", event)
						this.dragged = this.fire("dragstart", event)
						this.moved = true
					}
					this.prevX = this.pageX
					this.prevY = this.pageY
					break

				case APP.events.end:
				case APP.events.cancel:

					if ( APP.is.android && !this.started ) break
					this.started = false

					this.unbind(APP.events.move)
					document.addEventListener && this.unbind(APP.events.end)

					this.holdTimer = this.clearTimer( this.holdTimer )

					if ( this.holdFired ) {
						this.modifier = false
						this.fire("stop", event)
						break
					}
				
					var now = +new Date
					,	lastTouch = this.lastTouch || now + 1 /** the first time this will make delta a negative number */

					delta = now - lastTouch

					this.lastTouch = now
					if( (delta < this.clickDelay && delta > 0) ) {
						this.clickTimer = this.clearTimer(this.clickTimer)
						this.fire("doubleclick", event)
						this.modifier = false
						this.fire("stop", event)
						break

					} else if (false === this.clickTimer && !this.moved ) {

						this.clickTimer = setTimeout( function() {
							self.clickTimer = false
							// if we throttle and is time passed ?
							if ( delta < 1 || !(self.throttleClick && delta < self.clickDelay) ) {
								// if modifier pressed - do not fire click!
								if (self.handleModifierEvents || !self.modifier) {
									self.fire("click", event)
									self.onclick && self.onclick.call(self.context, event, self.originalTarget)
								}
							}
							self.modifier = false
							self.fire("stop", event)
						}, this.clickDelay)
						break
					}
					if ( this.dragged ) {
						this.clickTimer = this.clearTimer( this.clickTimer )
						this.fire("dragstop", event)
					} else {
						this.fire("stop", event)
					}
					this.modifier = false
					break
				}
		}
	} // end of prototype


APP.multiclicker = multiclicker

})(window, (window.atirip || (window.atirip = {}) ));

