<p>This example uses the dynamic loading capability built into YUI to
pull in additional components as needed.  In addition, it demonstrates
how to define external modules that can be loaded alongside YUI.
</p>
<p>This example works as follows:</p>
<ol>
<li>A <code>YUI</code> instance is created with a configuration object that defines parameters we need to dynamically load new modules.</li>
<li><code>node</code> is used so that we can bind an event listener to a button.  YUI will dynamically fetch <code>node</code> and its
dependencies.  By default, these dependencies will be fetched from the Yahoo! CDN and will be combined into a single file.</li>
<li>A click listener is added to a button.</li>
<li>When this button is clicked, YUI will dynamically fetch 3.x Drag &amp; Drop and 2.x Calendar files.  
The CSS file will be fetched first; this helps prevent a flash of unstyled content when the
Calendar Control is loaded.  This file is inserted above a style block which contains our custom calendar styles (via a YUI config option) so that styles are applied in the correct order.</li>
<li>A Calendar instance is created, and it is made draggable.</li>
</ol>
