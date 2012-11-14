Zepto plugin for CouchDB
=============

Port of jquery.couch.js, a plugin for accessing [CouchDB](http://couchdb.apache.org) using [Zepto.js](http://zeptojs.com).

## Example ##

First of all you need to [install CouchDB](http://wiki.apache.org/couchdb/Installation) and start it up.  Then run this HTML page.  If all is successful, you'll see the text "Welcome", courtesy of CouchDB.

	<html>
	    <head>
	        <script type="text/javascript" src="zepto.min.js"></script>
	        <script type="text/javascript" src="zepto.couchdb.min.js"></script>
	        <title>CouchDB Welcome</title>
	    </head>
	    <body>
	        <script type="text/javascript">
	            $.couch.urlPrefix = 'http://localhost:5984';
	            $.couch.info({
	                success: function(data) {
	                    document.write(data.couchdb);
	                }
	            });
	        </script>
	    </body>
	</html>

The main item to note is setting `$.couch.urlPrefix` to `http://localhost:5984`, which is the path to your local CouchDB server.

## Documentation ##

Since this is a very simple port of jquery.couch.js, with only a few modifications to use Zepto.js, the documentation for jquery.couch.js applies.  Dale Harvey has created some [JSDoc documentation for jquery.couch.js](http://daleharvey.github.com/jquery.couch.js-docs/symbols/index.html).  Just mentally translate any links to [jQuery ajax settings](http://api.jquery.com/jQuery.ajax/#jQuery-ajax-settings) to [Zepto.js ajax settings](http://zeptojs.com/#ajax), which are very similar.  Bradley Holt also has an [excellent reference to jquery.couchdb.js](http://bradley-holt.com/2011/07/couchdb-jquery-plugin-reference/).

## TouchDB ##

Since I ported jquery.couch.js to Zepto in order to use it with [PhoneGap](http://phonegap.com) and [TouchDB](https://github.com/couchbaselabs/TouchDB-iOS) I've created a version of the plugin that's specific to TouchDB--it simply removes some [methods that TouchDB doesn't support](https://github.com/couchbaselabs/TouchDB-iOS/wiki/Guide%3A-Differences-From-CouchDB), and helpfully pre-populates `$.couch.urlPrefix` with `http://.touchdb.` (see [TouchDB issue 134](https://github.com/couchbaselabs/TouchDB-iOS/issues/134) for why it doesn't use `touchdb:///`.

## License ##

Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License. You may obtain a copy of
the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
License for the specific language governing permissions and limitations under
the License.