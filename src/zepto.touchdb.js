// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

/**
 * @namespace
 * $.couch is used to communicate with a CouchDB server, the server methods can
 * be called directly without creating an instance. Typically all methods are
 * passed an <code>options</code> object which defines a success callback which
 * is called with the data returned from the http request to CouchDB, you can
 * find the other settings that can be used in the <code>options</code> object
 * from <a href="http://zeptojs.com/#ajax">
 * Zepto.js ajax settings</a>
 * <pre><code>$.couch.activeTasks({
 *   success: function (data) {
 *     console.log(data);
 *   }
 * });</code></pre>
 * Outputs (for example):
 * <pre><code>[
 *  {
 *   "pid" : "<0.11599.0>",
 *   "status" : "Copied 0 of 18369 changes (0%)",
 *   "task" : "recipes",
 *   "type" : "Database Compaction"
 *  }
 *]</code></pre>
 */
(function($) {

  $.couch = $.couch || {};
  /** @lends $.couch */

  /**
   * @private
   */
  function encodeDocId(docID) {
    var parts = docID.split("/");
    if (parts[0] == "_design") {
      parts.shift();
      return "_design/" + encodeURIComponent(parts.join('/'));
    }
    return encodeURIComponent(docID);
  }

  /**
   * @private
   */

  var uuidCache = [];

  $.extend($.couch, {
    urlPrefix: 'http://.touchdb.',

    /**
     * You can obtain a list of active tasks by using the /_active_tasks URL.
     * The result is a JSON array of the currently running tasks, with each task
     * being described with a single object.
     * @see <a href="http://techzone.couchbase.com/sites/default/files/uploads/
     * all/documentation/couchbase-api-misc.html#couchbase-api-misc_active-task
     * s_get">docs for /_active_tasks</a>
     * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
     * Zepto.js ajax settings</a>
     */
    activeTasks: function(options) {
      ajax(
        {url: this.urlPrefix + "/_active_tasks"},
        options,
        "Active task status could not be retrieved"
      );
    },

    /**
     * Returns a list of all the databases in the CouchDB instance
     * @see <a href="http://techzone.couchbase.com/sites/default/files/uploads/
     * all/documentation/couchbase-api-misc.html#couchbase-api-misc_active-task
     * s_get">docs for /_all_dbs</a>
     * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
     * Zepto.js ajax settings</a>
     */
    allDbs: function(options) {
      ajax(
        {url: this.urlPrefix + "/_all_dbs"},
        options,
        "An error occurred retrieving the list of all databases"
      );
    },

    /**
     * @namespace
     * $.couch.db is used to communicate with a specific CouchDB database
     * <pre><code>var $db = $.couch.db("mydatabase");
     *$db.allApps({
     *  success: function (data) {
     *    ... process data ...
     *  }
     *});
     * </code></pre>
     */
    db: function(name, db_opts) {
      db_opts = db_opts || {};
      var rawDocs = {};
      function maybeApplyVersion(doc) {
        if (doc._id && doc._rev && rawDocs[doc._id] &&
            rawDocs[doc._id].rev == doc._rev) {
          // todo: can we use commonjs require here?
          if (typeof Base64 == "undefined") {
            throw 'Base64 support not found.';
          } else {
            doc._attachments = doc._attachments || {};
            doc._attachments["rev-"+doc._rev.split("-")[0]] = {
              content_type :"application/json",
              data : Base64.encode(rawDocs[doc._id].raw)
            };
            return true;
          }
        }
      };
      return /** @lends $.couch.db */{
        name: name,
        uri: this.urlPrefix + "/" + encodeURIComponent(name) + "/",

        /**
         * Request compaction of the specified database.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_
         * db-compact_post">docs for /db/_compact</a>
         * @param {ajaxSettings} options
         * <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        compact: function(options) {
          $.extend(options, {successStatus: 202});
          ajax({
              type: "POST", url: this.uri + "_compact",
              data: "", processData: false
            },
            options,
            "The database could not be compacted"
          );
        },

        /**
         * Cleans up the cached view output on disk for a given view.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-db.html#couchbase-api-db
         * _db-view-cleanup_post">docs for /db/_compact</a>
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        viewCleanup: function(options) {
          $.extend(options, {successStatus: 202});
          ajax({
              type: "POST", url: this.uri + "_view_cleanup",
              data: "", processData: false
            },
            options,
            "The views could not be cleaned up"
          );
        },

        /**
         * Compacts the view indexes associated with the specified design
         * document. You can use this in place of the full database compaction
         * if you know a specific set of view indexes have been affected by a
         * recent database change.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/upl
         * oads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-
         * compact-design-doc_post">docs for /db/_compact/design-doc</a>
         * @param {String} groupname Name of design-doc to compact
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        compactView: function(groupname, options) {
          $.extend(options, {successStatus: 202});
          ajax({
              type: "POST", url: this.uri + "_compact/" + groupname,
              data: "", processData: false
            },
            options,
            "The view could not be compacted"
          );
        },

        /**
         * Create a new database
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_
         * db_put">docs for PUT /db/</a>
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        create: function(options) {
          $.extend(options, {successStatus: 201});
          ajax({
              type: "PUT", url: this.uri, contentType: "application/json",
              data: "", processData: false
            },
            options,
            "The database could not be created"
          );
        },

        /**
         * Deletes the specified database, and all the documents and
         * attachments contained within it.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_
         * db_delete">docs for DELETE /db/</a>
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        drop: function(options) {
          ajax(
            {type: "DELETE", url: this.uri},
            options,
            "The database could not be deleted"
          );
        },

        /**
         * Gets information about the specified database.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-db.html#couchbase-api-db
         * _db_get">docs for GET /db/</a>
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        info: function(options) {
          ajax(
            {url: this.uri},
            options,
            "Database information could not be retrieved"
          );
        },

        /**
         * @namespace
         * $.couch.db.changes provides an API for subscribing to the changes
         * feed
         * <pre><code>var $changes = $.couch.db("mydatabase").changes();
         *$changes.onChange = function (data) {
         *    ... process data ...
         * }
         * $changes.stop();
         * </code></pre>
         */
        changes: function(since, options) {

          options = options || {};
          // set up the promise object within a closure for this handler
          var timeout = 100, db = this, active = true,
            listeners = [],
            promise = /** @lends $.couch.db.changes */ {
              /**
               * Add a listener callback
               * @see <a href="http://techzone.couchbase.com/sites/default/
               * files/uploads/all/documentation/couchbase-api-db.html#couch
               * base-api-db_db-changes_get">docs for /db/_changes</a>
               * @param {Function} fun Callback function to run when
               * notified of changes.
               */
            onChange : function(fun) {
              listeners.push(fun);
            },
              /**
               * Stop subscribing to the changes feed
               */
            stop : function() {
              active = false;
            }
          };
          // call each listener when there is a change
          function triggerListeners(resp) {
            $.each(listeners, function() {
              this(resp);
            });
          };
          // when there is a change, call any listeners, then check for
          // another change
          options.success = function(resp) {
            timeout = 100;
            if (active) {
              since = resp.last_seq;
              triggerListeners(resp);
              getChangesSince();
            };
          };
          options.error = function() {
            if (active) {
              setTimeout(getChangesSince, timeout);
              timeout = timeout * 2;
            }
          };
          // actually make the changes request
          function getChangesSince() {
            var opts = $.extend({heartbeat : 10 * 1000}, options, {
              feed : "longpoll",
              since : since
            });
            ajax(
              {url: db.uri + "_changes"+encodeOptions(opts)},
              options,
              "Error connecting to "+db.uri+"/_changes."
            );
          }
          // start the first request
          if (since) {
            getChangesSince();
          } else {
            db.info({
              success : function(info) {
                since = info.update_seq;
                getChangesSince();
              }
            });
          }
          return promise;
        },

        /**
         * Fetch all the docs in this db, you can specify an array of keys to
         * fetch by passing the <code>keys</code> field in the
         * <code>options</code>
         * parameter.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_
         * db-all-docs_get">docs for /db/all_docs/</a>
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        allDocs: function(options) {
          var type = "GET";
          var data = null;
          if (options["keys"]) {
            type = "POST";
            var keys = options["keys"];
            delete options["keys"];
            data = toJSON({ "keys": keys });
          }
          ajax({
              type: type,
              data: data,
              url: this.uri + "_all_docs" + encodeOptions(options)
            },
            options,
            "An error occurred retrieving a list of all documents"
          );
        },

        /**
         * Fetch all the design docs in this db
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        allDesignDocs: function(options) {
          this.allDocs($.extend(
            {startkey:"_design", endkey:"_design0"}, options));
        },

        /**
         * Fetch all the design docs with an index.html, <code>options</code>
         * parameter expects an <code>eachApp</code> field which is a callback
         * called on each app found.
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        allApps: function(options) {
          options = options || {};
          var self = this;
          if (options.eachApp) {
            this.allDesignDocs({
              success: function(resp) {
                $.each(resp.rows, function() {
                  self.openDoc(this.id, {
                    success: function(ddoc) {
                      var index, appPath, appName = ddoc._id.split('/');
                      appName.shift();
                      appName = appName.join('/');
                      index = ddoc.couchapp && ddoc.couchapp.index;
                      if (index) {
                        appPath = ['', name, ddoc._id, index].join('/');
                      } else if (ddoc._attachments &&
                                 ddoc._attachments["index.html"]) {
                        appPath = ['', name, ddoc._id, "index.html"].join('/');
                      }
                      if (appPath) options.eachApp(appName, appPath, ddoc);
                    }
                  });
                });
              }
            });
          } else {
            throw 'Please provide an eachApp function for allApps()';
          }
        },

        /**
         * Returns the specified doc from the specified db.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-dbdoc.html#couchbase-api-
         * dbdoc_db-doc_get">docs for GET /db/doc</a>
         * @param {String} docId id of document to fetch
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         * @param {ajaxSettings} ajaxOptions <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        openDoc: function(docId, options, ajaxOptions) {
          options = options || {};
          if (db_opts.attachPrevRev || options.attachPrevRev) {
            $.extend(options, {
              beforeSuccess : function(req, doc) {
                rawDocs[doc._id] = {
                  rev : doc._rev,
                  raw : req.responseText
                };
              }
            });
          } else {
            $.extend(options, {
              beforeSuccess : function(req, doc) {
                if (doc["zepto.couch.attachPrevRev"]) {
                  rawDocs[doc._id] = {
                    rev : doc._rev,
                    raw : req.responseText
                  };
                }
              }
            });
          }
          ajax({url: this.uri + encodeDocId(docId) + encodeOptions(options)},
            options,
            "The document could not be retrieved",
            ajaxOptions
          );
        },

        /**
         * Create a new document in the specified database, using the supplied
         * JSON document structure. If the JSON structure includes the _id
         * field, then the document will be created with the specified document
         * ID. If the _id field is not specified, a new unique ID will be
         * generated.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-dbdoc.html#couchbase-api-
         * dbdoc_db_post">docs for GET /db/doc</a>
         * @param {String} doc document to save
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        saveDoc: function(doc, options) {
          options = options || {};
          var db = this;
          var beforeSend = fullCommit(options);
          if (doc._id === undefined) {
            var method = "POST";
            var uri = this.uri;
          } else {
            var method = "PUT";
            var uri = this.uri + encodeDocId(doc._id);
          }
          var versioned = maybeApplyVersion(doc);
          $.ajax({
            type: method, url: uri + encodeOptions(options),
            contentType: "application/json",
            dataType: "json", data: toJSON(doc),
            beforeSend : beforeSend,
            complete: function(req) {
              var resp = JSON.parse(req.responseText);
              if (req.status == 200 || req.status == 201 || req.status == 202) {
                doc._id = resp.id;
                doc._rev = resp.rev;
                if (versioned) {
                  db.openDoc(doc._id, {
                    attachPrevRev : true,
                    success : function(d) {
                      doc._attachments = d._attachments;
                      if (options.success) options.success(resp);
                    }
                  });
                } else {
                  if (options.success) options.success(resp);
                }
              } else if (options.error) {
                options.error(req.status, resp.error, resp.reason);
              } else {
                throw "The document could not be saved: " + resp.reason;
              }
            }
          });
        },

        /**
         * Save a list of documents
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_
         * db-bulk-docs_post">docs for /db/_bulk_docs</a>
         * @param {Object[]} docs List of documents to save
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        bulkSave: function(docs, options) {
          var beforeSend = fullCommit(options);
          $.extend(options, {successStatus: 201, beforeSend : beforeSend});
          ajax({
              type: "POST",
              url: this.uri + "_bulk_docs" + encodeOptions(options),
              contentType: "application/json", data: toJSON(docs)
            },
            options,
            "The documents could not be saved"
          );
        },

        /**
         * Deletes the specified document from the database. You must supply
         * the current (latest) revision and <code>id</code> of the document
         * to delete eg <code>removeDoc({_id:"mydoc", _rev: "1-2345"})</code>
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-dbdoc.html#couchbase-api
         * -dbdoc_db-doc_delete">docs for DELETE /db/doc</a>
         * @param {Object} doc Document to delete
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        removeDoc: function(doc, options) {
          ajax({
              type: "DELETE",
              url: this.uri +
                   encodeDocId(doc._id) +
                   encodeOptions({rev: doc._rev})
            },
            options,
            "The document could not be deleted"
          );
        },

        /**
         * Remove a set of documents
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_
         * db-bulk-docs_post">docs for /db/_bulk_docs</a>
         * @param {String[]} docs List of document id's to remove
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        bulkRemove: function(docs, options){
          docs.docs = $.each(
            docs.docs, function(i, doc){
              doc._deleted = true;
            }
          );
          $.extend(options, {successStatus: 201});
          ajax({
              type: "POST",
              url: this.uri + "_bulk_docs" + encodeOptions(options),
              data: toJSON(docs)
            },
            options,
            "The documents could not be deleted"
          );
        },

        /**
         * The COPY command (which is non-standard HTTP) copies an existing
         * document to a new or existing document.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-dbdoc.html#couchbase-api-
         * dbdoc_db-doc_copy">docs for COPY /db/doc</a>
         * @param {String[]} docId document id to copy
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        copyDoc: function(docId, options, ajaxOptions) {
          ajaxOptions = $.extend(ajaxOptions, {
            complete: function(req) {
              var resp = JSON.parse(req.responseText);
              if (req.status == 201) {
                if (options.success) options.success(resp);
              } else if (options.error) {
                options.error(req.status, resp.error, resp.reason);
              } else {
                throw "The document could not be copied: " + resp.reason;
              }
            }
          });
          ajax({
              type: "COPY",
              url: this.uri + encodeDocId(docId)
            },
            options,
            "The document could not be copied",
            ajaxOptions
          );
        },

        /**
         * Creates (and executes) a temporary view based on the view function
         * supplied in the JSON request.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-db.html#couchbase-api-db
         * _db-temp-view_post">docs for /db/_temp_view</a>
         * @param {Function} mapFun Map function
         * @param {Function} reduceFun Reduce function
         * @param {Function} language Language the map / reduce funs are
         * implemented in
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        query: function(mapFun, reduceFun, language, options) {
          language = language || "javascript";
          if (typeof(mapFun) !== "string") {
            mapFun = mapFun.toSource ? mapFun.toSource()
              : "(" + mapFun.toString() + ")";
          }
          var body = {language: language, map: mapFun};
          if (reduceFun != null) {
            if (typeof(reduceFun) !== "string")
              reduceFun = reduceFun.toSource ? reduceFun.toSource()
                : "(" + reduceFun.toString() + ")";
            body.reduce = reduceFun;
          }
          ajax({
              type: "POST",
              url: this.uri + "_temp_view" + encodeOptions(options),
              contentType: "application/json", data: toJSON(body)
            },
            options,
            "An error occurred querying the database"
          );
        },

        /**
         * Fetch a _list view output, you can specify a list of
         * <code>keys</code> in the options object to recieve only those keys.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-design.html#couchbase-api
         * -design_db-design-designdoc-list-listname-viewname_get">
         * docs for /db/_design/design-doc/_list/l1/v1</a>
         * @param {String} list Listname in the form of ddoc/listname
         * @param {String} view View to run list against
         * @param {options} CouchDB <a href="http://wiki.apache.org/couchdb/
         * HTTP_view_API">View Options</a>
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        list: function(list, view, options, ajaxOptions) {
          var list = list.split('/');
          var options = options || {};
          var type = 'GET';
          var data = null;
          if (options['keys']) {
            type = 'POST';
            var keys = options['keys'];
            delete options['keys'];
            data = toJSON({'keys': keys });
          }
          ajax({
              type: type,
              data: data,
              url: this.uri + '_design/' + list[0] +
                   '/_list/' + list[1] + '/' + view + encodeOptions(options)
              },
              ajaxOptions, 'An error occured accessing the list'
          );
        },

        /**
         * Executes the specified view-name from the specified design-doc
         * design document, you can specify a list of <code>keys</code>
         * in the options object to recieve only those keys.
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api-design.html#couchbase-api-
         * design_db-design-designdoc-view-viewname_get">docs for /db/
         * _design/design-doc/_list/l1/v1</a>
         * @param {String} name View to run list against (string should have 
         * the design-doc name followed by a slash and the view name)
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        view: function(name, options) {
          var name = name.split('/');
          var options = options || {};
          var type = "GET";
          var data= null;
          if (options["keys"]) {
            type = "POST";
            var keys = options["keys"];
            delete options["keys"];
            data = toJSON({ "keys": keys });
          }
          ajax({
              type: type,
              data: data,
              url: this.uri + "_design/" + name[0] +
                   "/_view/" + name[1] + encodeOptions(options)
            },
            options, "An error occurred accessing the view"
          );
        },

        /**
         * Fetch an arbitrary CouchDB database property
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api.html">docs for /db/_prop</a>
         * @param {String} propName Propery name to fetch
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         * @param {ajaxSettings} ajaxOptions <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        getDbProperty: function(propName, options, ajaxOptions) {
          ajax({url: this.uri + propName + encodeOptions(options)},
            options,
            "The property could not be retrieved",
            ajaxOptions
          );
        },

        /**
         * Set an arbitrary CouchDB database property
         * @see <a href="http://techzone.couchbase.com/sites/default/files/
         * uploads/all/documentation/couchbase-api.html">docs for /db/_prop</a>
         * @param {String} propName Propery name to fetch
         * @param {String} propValue Propery value to set
         * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         * @param {ajaxSettings} ajaxOptions <a href="http://zeptojs.com/#ajax">
         * Zepto.js ajax settings</a>
         */
        setDbProperty: function(propName, propValue, options, ajaxOptions) {
          ajax({
            type: "PUT", 
            url: this.uri + propName + encodeOptions(options),
            data : JSON.stringify(propValue)
          },
            options,
            "The property could not be updated",
            ajaxOptions
          );
        }
      };
    },

    encodeDocId: encodeDocId, 

    /**
     * Accessing the root of a CouchDB instance returns meta information about
     * the instance. The response is a JSON structure containing information
     * about the server, including a welcome message and the version of the
     * server.
     * @see <a href="http://techzone.couchbase.com/sites/default/files/uploads/
     * all/documentation/couchbase-api-misc.html#couchbase-api-misc_root_get">
     * docs for GET /</a>
     * @param {ajaxSettings} options <a href="http://zeptojs.com/#ajax">
     * Zepto.js ajax settings</a>
     */
    info: function(options) {
      ajax(
        {url: this.urlPrefix + "/"},
        options,
        "Server information could not be retrieved"
      );
    },

    /**
     * Request, configure, or stop, a replication operation.
     * @see <a href="http://techzone.couchbase.com/sites/default/files/
     * uploads/all/documentation/couchbase-api-misc.html#couchbase-api-
     * misc_replicate_post">docs for POST /_replicate</a>
     * @param {String} source Path or url to source database
     * @param {String} target Path or url to target database
     * @param {ajaxSettings} ajaxOptions <a href="http://zeptojs.com/#ajax">
     * Zepto.js ajax settings</a>
     * @param {Object} repOpts Additional replication options
     */
    replicate: function(source, target, ajaxOptions, repOpts) {
      repOpts = $.extend({source: source, target: target}, repOpts);
      if (repOpts.continuous && !repOpts.cancel) {
        ajaxOptions.successStatus = 202;
      }
      ajax({
          type: "POST", url: this.urlPrefix + "/_replicate",
          data: JSON.stringify(repOpts),
          contentType: "application/json"
        },
        ajaxOptions,
        "Replication failed"
      );
    },

    /**
     * Fetch a new UUID
     * @see <a href="http://techzone.couchbase.com/sites/default/files/
     * uploads/all/documentation/couchbase-api-misc.html#couchbase-api-
     * misc_uuids_get">docs for /_uuids</a>
     * @param {Int} cacheNum Number of uuids to keep cached for future use
     */
    newUUID: function(cacheNum) {
      if (cacheNum === undefined) {
        cacheNum = 1;
      }
      if (!uuidCache.length) {
        ajax({url: this.urlPrefix + "/_uuids", data: {count: cacheNum}, async:
              false}, {
            success: function(resp) {
              uuidCache = resp.uuids;
            }
          },
          "Failed to retrieve UUID batch."
        );
      }
      return uuidCache.shift();
    }
  });

  /**
   * @private
   */
  function ajax(obj, options, errorMessage, ajaxOptions) {
    var timeStart;
    var defaultAjaxOpts = {
      contentType: "application/json",
      headers:{"Accept": "application/json"}
    };

    options = $.extend({successStatus: 200}, options);
    ajaxOptions = $.extend(defaultAjaxOpts, ajaxOptions);
    errorMessage = errorMessage || "Unknown error";
    timeStart = (new Date()).getTime();
    $.ajax($.extend($.extend({
      type: "GET", dataType: "json",
      beforeSend: function(xhr){
        if(ajaxOptions && ajaxOptions.headers){
          for (var header in ajaxOptions.headers){
            xhr.setRequestHeader(header, ajaxOptions.headers[header]);
          }
        }
      },
      complete: function(req) {
        var reqDuration = (new Date()).getTime() - timeStart;
        try {
          var resp = JSON.parse(req.responseText);
        } catch(e) {
          if (options.error) {
            options.error(req.status, req, e);
          } else {
            throw errorMessage + ': ' + e;
          }
          return;
        }
        if (options.ajaxStart) {
          options.ajaxStart(resp);
        }
        if (req.status == options.successStatus) {
          if (options.beforeSuccess) options.beforeSuccess(req, resp, reqDuration);
          if (options.success) options.success(resp, reqDuration);
        } else if (options.error) {
          options.error(req.status, resp && resp.error ||
                        errorMessage, resp && resp.reason || "no response",
                        reqDuration);
        } else {
          throw errorMessage + ": " + resp.reason;
        }
      }
    }, obj), ajaxOptions));
  }

  /**
   * @private
   */
  function fullCommit(options) {
    var options = options || {};
    if (typeof options.ensure_full_commit !== "undefined") {
      var commit = options.ensure_full_commit;
      delete options.ensure_full_commit;
      return function(xhr) {
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader("X-Couch-Full-Commit", commit.toString());
      };
    }
  };

  /**
   * @private
   */
  // Convert a options object to an url query string.
  // ex: {key:'value',key2:'value2'} becomes '?key="value"&key2="value2"'
  function encodeOptions(options) {
    var buf = [];
    if (typeof(options) === "object" && options !== null) {
      for (var name in options) {
        if ($.inArray(name,
                      ["error", "success", "beforeSuccess", "ajaxStart"]) >= 0)
          continue;
        var value = options[name];
        if ($.inArray(name, ["key", "startkey", "endkey"]) >= 0) {
          value = toJSON(value);
        }
        buf.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
      }
    }
    return buf.length ? "?" + buf.join("&") : "";
  }

  /**
   * @private
   */
  function toJSON(obj) {
    return obj !== null ? JSON.stringify(obj) : null;
  }

})(Zepto);
