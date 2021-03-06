/**
 * ScrollView module
 *
 * @module scrollview
 * @submodule scrollview-base
 */

var getClassName = Y.ClassNameManager.getClassName,
    SCROLLVIEW = 'scrollview',
    CLASS_NAMES = {
        scrollbar: getClassName(SCROLLVIEW, 'scrollbar'),
        vertical: getClassName(SCROLLVIEW, 'vertical'),
        horizontal: getClassName(SCROLLVIEW, 'horizontal'),
        child: getClassName(SCROLLVIEW, 'child'),
        top: getClassName(SCROLLVIEW, 'top'),
        bottom: getClassName(SCROLLVIEW, 'bottom'),
        middle: getClassName(SCROLLVIEW, 'middle'),
        showing: getClassName(SCROLLVIEW, 'showing')
    },
    EV_SCROLL_START = 'scrollStart',
    EV_SCROLL_CHANGE = 'scrollChange',
    EV_SCROLL_END = 'scrollEnd',
    EV_SCROLL_FLICK = 'flick',

    FLICK = EV_SCROLL_FLICK,

    UI = 'ui',

    SCROLL_Y = "scrollY",
    SCROLL_X = "scrollX",
    BOUNCE = "bounce",
    
    DIM_X = "x",
    DIM_Y = "y",

    BOUNDING_BOX = "boundingBox",
    CONTENT_BOX = "contentBox",

    NATIVE_TRANSITIONS = Y.Transition.useNative;

Y.Node.DOM_EVENTS.DOMSubtreeModified = true;

/**
 * ScrollView provides a scrollable container for devices which do not 
 * support overflow: hidden
 *
 * @class ScrollView
 * @param config {Object} Object literal specifying scrollview configuration properties.
 * @extends Widget
 * @constructor
 */
function ScrollView() {
    ScrollView.superclass.constructor.apply(this, arguments);
}

Y.ScrollView = Y.extend(ScrollView, Y.Widget, {
    
    // Y.ScrollView prototype
    
    /**
     * Designated initializer
     *
     * @method initializer
     */
    initializer: function() {
        this._createEvents();
    },

    /** 
     * Publish events which occur during the scroll lifecycle
     *
     * @method _createEvents
     * @private
     */    
    _createEvents: function() {
        this.publish(EV_SCROLL_START);
        this.publish(EV_SCROLL_CHANGE);
        this.publish(EV_SCROLL_END);
        this.publish(EV_SCROLL_FLICK);
    },

    /** 
     * Override the contentBox sizing method, since the contentBox height
     * should not be that of the boundingBox.
     *
     * @method _uiSizeCB
     * @protected
     */
    _uiSizeCB: function() {},

    /**
     * TranstionEnd event handler
     *
     * @method _transitionEnded
     * @private
     */
    _transitionEnded: function() {
        this.fire(EV_SCROLL_END);
    },

    /**
     * bindUI implementation
     *
     * Hooks up events for the widget
     * @method bindUI
     */
    bindUI: function() {

        var cb = this.get(CONTENT_BOX),
            flick = this.get(FLICK); 

        this.get(BOUNDING_BOX).on('gesturemovestart', Y.bind(this._onGestureMoveStart, this));
        cb.on('transitionend', Y.bind(this._transitionEnded, this), false);

        // TODO: Fires way to often when using non-native transitions
        if (NATIVE_TRANSITIONS) {
            cb.on('DOMSubtreeModified', Y.bind(this._uiDimensionsChange, this));
        }

        if (flick) {
            cb.on("flick", Y.bind(this._flick, this), flick);
        }

        this.after({
            'scrollYChange' : this._afterScrollYChange,
            'scrollXChange' : this._afterScrollXChange,
            'heightChange'  : this._afterHeightChange,
            'widthChange'   : this._afterWidthChange,
            'renderedChange': function() { Y.later(0, this, '_uiDimensionsChange'); } 
        });
    },

    /**
     * syncUI implementation
     *
     * Update the scroll position, based on the current value of scrollY
     * @method bindUI
     */
    syncUI: function() {
        this.scrollTo(this.get(SCROLL_X), this.get(SCROLL_Y));
    },

    /**
     * Scroll the element to a given y coordinate
     *
     * @method scrollTo
     * @param x {Number} The x-position to scroll to
     * @param y {Number} The y-position to scroll to
     * @param duration {Number} Duration, in ms, of the scroll animation (default is 0)
     * @param easing {String} An easing equation if duration is set
     */
    scrollTo: function(x, y, duration, easing) {
        var cb = this.get(CONTENT_BOX),
            xMove = x * -1,
            yMove = y * -1,
            transition;

        duration = duration || 0;
        easing = easing || ScrollView.EASING;

        if(x !== this.get(SCROLL_X)) {
            this.set(SCROLL_X, x, { src: UI });
        }

        if(y !== this.get(SCROLL_Y)) {
            this.set(SCROLL_Y, y, { src: UI });
        }

        transition = {
            easing : easing,
            duration : duration/1000
        };

        Y.log("Transition: duration, easing:" + transition.duration, transition.easing, "scrollview");        

        if (NATIVE_TRANSITIONS) {
            transition.transform = 'translate('+ xMove +'px,'+ yMove +'px)';
        } else {
            transition.left = xMove + "px"; 
            transition.top = yMove + "px";
        }

        cb.transition(transition);
    },

    /**
     * gesturemovestart event handler
     *
     * @method _onGestureMoveStart
     * @param e {Event} The event
     * @private
     */
    _onGestureMoveStart: function(e) {
        this._killTimer();

        var bb = this.get(BOUNDING_BOX);

        this._moveEvt = bb.on('gesturemove', Y.bind(this._onGestureMove, this));
        this._moveEndEvt = bb.on('gesturemoveend', Y.bind(this._onGestureMoveEnd, this));

        this._moveStartY = e.clientY + this.get(SCROLL_Y);
        this._moveStartX = e.clientX + this.get(SCROLL_X);
        
        this._moveStartTime = (new Date()).getTime();
        this._moveStartClientY = e.clientY;
        this._moveStartClientX = e.clientX;

        this._isDragging = false;
        this._snapToEdge = false;
    },    
    
    /**
     * gesturemove event handler
     *
     * @method _onGestureMove
     * @param e {Event} The event
     * @private
     */
    _onGestureMove: function(e) {
        this._isDragging = true;
        this._moveEndClientY = e.clientY;
        this._moveEndClientX = e.clientX;
        this._lastMoved = (new Date()).getTime();

        if(this._scrollsVertical) {
            this.set(SCROLL_Y, -(e.clientY - this._moveStartY));
        }
        
        if(this._scrollsHorizontal) {
            this.set(SCROLL_X, -(e.clientX - this._moveStartX));
        }
    },

    /**
     * gestureend event handler
     *
     * @method _onGestureMoveEnd
     * @param e {Event} The event
     * @private
     */
    _onGestureMoveEnd: function(e) {
        var minY = this._minScrollY,
            maxY = this._maxScrollY,
            minX = this._minScrollX,
            maxX = this._maxScrollX,
            startPoint = this._scrollsVertical ? this._moveStartClientY : this._moveStartClientX,
            endPoint = this._scrollsVertical ? this._moveEndClientY : this._moveEndClientX,
            distance = startPoint - endPoint;

        this._moveEvt.detach();
        this._moveEndEvt.detach();

        this._scrolledHalfway = false;
        this._snapToEdge = false;
        this._isDragging = false;

        if(this._scrollsHorizontal && Math.abs(distance) > (this.get('width')/2)) {
            this._scrolledHalfway = true;
            this._scrolledForward = distance > 0;
        }
        if(this._scrollsVertical && Math.abs(distance) > (this.get('height')/2)) {
            this._scrolledHalfway = true;
            this._scrolledForward = distance > 0;
        }

        // Check for minY
        if(this._scrollsVertical && this.get(SCROLL_Y) < minY) {
            this._snapToEdge = true;
            this.set(SCROLL_Y, minY);
        }
        
        // Check for minX
        if(this._scrollsHorizontal && this.get(SCROLL_X) < minX) {
            this._snapToEdge = true;
            this.set(SCROLL_X, minX);
        }
        
        // Check for maxY
        if(this.get(SCROLL_Y) > maxY) {
            this._snapToEdge = true;
            this.set(SCROLL_Y, maxY);
        }
        
        // Check for maxX
        if(this.get(SCROLL_X) > maxX) {
            this._snapToEdge = true;
            this.set(SCROLL_X, maxX);
        }
        
        if(this._snapToEdge) {
            return;
        }

        // Check for staleness
        if(+(new Date()) - this._moveStartTime > 100) {
            this.fire(EV_SCROLL_END, {
                staleScroll: true
            });
            return;
        }
    },

    /**
     * after listener for changes to the scrollY attr
     *
     * @method _afterScrollYChange
     * @param e {Event.Facade} The event
     * @protected
     */
    _afterScrollYChange : function(e) {
        if(e.src !== UI) {
            this._uiScrollY(e.newVal, e.duration, e.easing);
        }
    },
    
    /**
     * Update the UI when the scrollY attr changes
     *
     * @method _uiScrollY
     * @param val {Number} The scrollY value
     * @param duration {Number} The length (in ms) of the scroll animation
     * @param easing {String} An easing equation, if duration is defined
     * @protected
     */
    _uiScrollY : function(val, duration, easing) {
        duration = duration || this._snapToEdge ? 400 : 0;
        easing = easing || this._snapToEdge ? ScrollView.SNAP_EASING : null;

        this.scrollTo(this.get(SCROLL_X), val, duration, easing);
    },
    
    /**
     * after listener for changes to the scrollX attr
     *
     * @method _afterScrollXChange
     * @param e {Event.Facade} The event
     * @protected
     */
    _afterScrollXChange : function(e) {
        if(e.src !== UI) {
            this._uiScrollX(e.newVal, e.duration, e.easing);
        }
    },
    
    /**
     * Update the UI when the scrollX attr changes
     *
     * @method _uiScrollX
     * @param val {Number} The scrollX value
     * @param duration {Number} The length (in ms) of the scroll animation
     * @param easing {String} An easing equation, if duration is defined
     * @protected
     */
    _uiScrollX : function(val, duration, easing) {
        duration = duration || this._snapToEdge ? 400 : 0;
        easing = easing || this._snapToEdge ? ScrollView.SNAP_EASING : null;
            
        this.scrollTo(val, this.get(SCROLL_Y), duration, easing);
    },
    
    /**
     * after listener for the height attribute
     *
     * @method _afterHeightChange
     * @param e {Event.Facade} The event
     * @protected
     */
    _afterHeightChange: function() {
        this._uiDimensionsChange();
    },
    
    /**
     * after listener for the width attribute
     *
     * @method _afterHeightChange
     * @param e {Event.Facade} The event
     * @protected
     */
    _afterWidthChange: function() {
        this._uiDimensionsChange();
    },
    
    /**
     * This method gets invoked whenever the height or width attrs change,
     * allowing us to determine which scrolling axes need to be enabled.
     *
     * @method _uiDimensionsChange
     * @protected
     */
    _uiDimensionsChange: function() {
        var bb = this.get(BOUNDING_BOX),

            height = this.get('height'),
            width = this.get('width'),

            // Use bb instead of cb. cb doesn't gives us the right results
            // in FF (due to overflow:hidden)
            scrollHeight = bb.get('scrollHeight'),
            scrollWidth = bb.get('scrollWidth');

        if(height && scrollHeight > height) {
            this._scrollsVertical = true;
            this._maxScrollY = scrollHeight - height;
            this._minScrollY = 0;
            this._scrollHeight = scrollHeight;
            bb.addClass(getClassName("scroll-v"));
        }

        if(width && scrollWidth > width) {
            this._scrollsHorizontal = true;
            this._maxScrollX = scrollWidth - width;
            this._minScrollX = 0;
            this._scrollWidth = scrollWidth;
            bb.addClass(this.getClassName("scroll-h"));
        }
    },

    /**
     * Execute a flick at the end of a scroll action
     *
     * @method _flick
     * @param distance {Number} The distance (in px) the user scrolled before the flick
     * @param time {Number} The number of ms the scroll event lasted before the flick
     * @protected
     */
    _flick: function(e) {
        var flick = e.flick;
        this._currentVelocity = flick.velocity * flick.direction;
        this._flicking = true;
        this._flickFrame();

        this.fire(EV_SCROLL_FLICK);
    },

    /**
     * Execute a single frame in the flick animation
     *
     * @method _flickFrame
     * @protected
     */
    _flickFrame: function() {
        var newY = this.get(SCROLL_Y),
            maxY = this._maxScrollY,
            minY = this._minScrollY,
            newX = this.get(SCROLL_X),
            maxX = this._maxScrollX,
            minX = this._minScrollX,
            step = ScrollView.FRAME_STEP;
        
        this._currentVelocity = (this._currentVelocity*this.get('deceleration'));

        if(this._scrollsVertical) {
            newY = this.get(SCROLL_Y) - (this._currentVelocity * step);
        }
        if(this._scrollsHorizontal) {
            newX = this.get(SCROLL_X) - (this._currentVelocity * step);
        }
        
        if(Math.abs(this._currentVelocity).toFixed(4) <= 0.015) {
            this._flicking = false;
            this._killTimer(!(this._exceededYBoundary || this._exceededXBoundary));

            if(this._scrollsVertical) {
                if(newY < minY) {
                    this._snapToEdge = true;
                    this.set(SCROLL_Y, minY);
                } else if(newY > maxY) {
                    this._snapToEdge = true;
                    this.set(SCROLL_Y, maxY);
                }
            }
            
            if(this._scrollsHorizontal) {
                if(newX < minX) {
                    this._snapToEdge = true;
                    this.set(SCROLL_X, minX);
                } else if(newX > maxX) {
                    this._snapToEdge = true;
                    this.set(SCROLL_X, maxX);
                }
            }
            
            return;
        }
        
        if(this._scrollsVertical && (newY < minY || newY > maxY)) {
            this._exceededYBoundary = true;
            this._currentVelocity *= this.get(BOUNCE);
        }
        
        if(this._scrollsHorizontal && (newX < minX || newX > maxX)) {
            this._exceededXBoundary = true;
            this._currentVelocity *= this.get(BOUNCE);
        }
        
        if(this._scrollsVertical) {
            this.set(SCROLL_Y, newY);
        }
        
        if(this._scrollsHorizontal) {
            this.set(SCROLL_X, newX);
        }
        
        this._flickTimer = Y.later(ScrollView.FRAME_STEP, this, '_flickFrame');
    },
    
    /**
     * Stop the animation timer
     *
     * @method _killTimer
     * @param fireEvent {Boolean} If true, fire the scrollEnd event
     * @private
     */
    _killTimer: function(fireEvent) {
        if(this._flickTimer) {
            this._flickTimer.cancel();
        }
        
        if(fireEvent) {
            this.fire(EV_SCROLL_END);
        }
    },

    /**
     * @method _setScroll
     * @private
     * @param {Number} val
     * @param {String} dim
     */
    _setScroll : function(val, dim) {
        var bouncing = this.get(BOUNCE),
            range = ScrollView.BOUNCE_RANGE,
            maxScroll = (dim == DIM_X) ? this._maxScrollX : this._maxScrollY,

            min = bouncing ? -range : 0,
            max = bouncing ? maxScroll + range : maxScroll;

        if(!bouncing || !this._isDragging) {
            if(val < min) {
                val = min;
            } else if(val > max) {
                val = max;
            }            
        }

        return val;
    },

    /**
     * Setter for the scrollX ATTR
     *
     * @method _setScrollX
     * @param val {Number} The new scrollX value
     * @protected
     */    
    _setScrollX: function(val) {
        return this._setScroll(val, DIM_X);
    },

    /**
     * Setter for the scrollY ATTR
     *
     * @method _setScrollY
     * @param val {Number} The new scrollY value
     * @protected
     */
    _setScrollY: function(val) {
        return this._setScroll(val, DIM_Y);
    }
    
}, {
   
   // Y.ScrollView static properties

   /**
    * The identity of the widget.
    *
    * @property ScrollView.NAME
    * @type String
    * @default 'scrollview'
    * @readOnly
    * @protected
    * @static
    */
   NAME: 'scrollview',

   /**
    * Static property used to define the default attribute configuration of
    * the Widget.
    *
    * @property ScrollView.ATTRS
    * @type {Object}
    * @protected
    * @static
    */
    ATTRS: {

        /**
         * The scroll position in the y-axis
         *
         * @attribute scrollY
         * @type Number
         * @default 0
         */
        scrollY: {
            value: 0,
            setter: '_setScrollY'
        },

        /**
         * The scroll position in the x-axis
         *
         * @attribute scrollX
         * @type Number
         * @default 0
         */
        scrollX: {
            value: 0,
            setter: '_setScrollX'
        },

        /**
         * Drag coefficent for inertial scrolling. The closer to 1 this
         * value is, the less friction during scrolling.
         *
         * @attribute deceleration
         * @default 0.98
         */
        deceleration: {
            value: 0.98
        },

        /**
         * Drag coefficient for intertial scrolling at the upper
         * and lower boundaries of the scrollview. Set to 0 to 
         * disable "rubber-banding".
         *
         * @attribute bounce
         * @type Number
         * @default 0.7
         */
        bounce: {
            value: 0.7
        },

        /**
         * The minimum distance and/or velocity which define a flick
         *
         * @attribute flick
         * @type Object
         * @default Object with properties minDistance = 10, minVelocity = 0.
         */
        flick: {
            value: {
                minDistance: 10,
                minVelocity: 0
            }
        }
    },

    /**
     * List of class names used in the scrollview's DOM
     *
     * @property CLASS_NAMES
     * @type Object
     * @static
     */
    CLASS_NAMES: CLASS_NAMES,

    /**
     * Flag used to source property changes initiated from the DOM
     *
     * @property UI_SRC
     * @type String
     * @static
     */
    UI_SRC: UI,

    BOUNCE_RANGE : 150,

    FRAME_STEP : 10,

    EASING : 'cubic-bezier(0, 0.1, 0, 1.0)',

    SNAP_EASING : 'ease-out'

});