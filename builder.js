$( function( $ ) {
	var baseUrl = "http://amd-builder.no.de",
		dependencyMap,
		builderhtml = [],
		sortable = [],
		groupBy = function( data, iterator ) {
			var res = {};

			_.each( _.uniq( _.map( data, iterator ) ), function( val ) {
				res[val] = {};
			});

			_.each( data, function( value, key, list ) {
				if ( value.group ) {
					res[ value.group ][ key ] = value;
				} else {
					res.other[ key ] = value;
				}
			});
			return res;
		},
		module2domId = function( module ) {
			return module.replace( /\./g, '-' ).replace( /^(.)/, function( c ) { return c.toLowerCase(); } );
		},
		group2domId = function( group ) {
			return group.replace( / /g, '-' ).replace( /^(.)/, function( c ) { return c.toLowerCase(); } );
		},
		strip = function( file ) {
			return file.replace( /^\.\//g, '' ).replace( /\./g, '-' );
		},
		buildForm = function( data ) {
			var $form = $( "#builder" ),
				groupedComponents = groupBy( data, function( o ) {
					return ( o.group || "other" );
				});

			_.forEach( groupedComponents, function( o, group ) {
				if ( group != "exclude" ) {
					var $group = $( "<ul>" ).attr( "id", group2domId( group ) );
					_.forEach( groupedComponents[ group ], function( component, name ) {
						var id = module2domId( name ),
							label = data[ name ].label,
							desc = data[ name ].description,
							req = data[ name ].required,
							labelm = "<label for='" + id + "'>" + label + "</label>",
							inputm = "<input type='checkbox' id='" + id + "' name='" + id + "'" + ( req ? " checked='checked' disabled='true'" : "") + "/>",
							descm = "<p class='desc'>" + desc + "</p>",
							item = inputm;

						if ( /^jquery\.mobile/.test( name ) ) {
							if ( label ) { item = item + labelm; }
							if ( desc ) { item = item + descm; }

							$group.append( "<li>" + item + "</li>" );
						}
					});
					$form.append( "<h3 class='hed-cat'>" + group + "</h3>" );
					$form.append( $group );
				}
			});
			$form.append( '<input type="submit" value="Build My Download" class="buildBtn">' ).removeClass( "loading" );
		},
		buildCheckListFor = function( id, hash ) {
			var module = dependencyMap[ id ];
			hash = hash || {};
			if ( module && module.deps ) {
				_.each( module.deps, function( name, index ) {
					if ( !( name in hash) ) {
						hash[ name ] = true;
						buildCheckListFor( name, hash );						
					}
				});
			}
			return _.keys( hash );
		},
		buildUncheckListFor = function( id, hash ) {
			hash = hash || {};
			_.each( dependencyMap, function( module, name ) {
				if ( !( name in hash ) ) {
					if ( _.indexOf( module.deps, id ) > -1 ) {
						hash[ name ] = true;
						buildUncheckListFor( name, hash );
					}
				}
			});
			return _.keys( hash );
		},
		resolveDependencies = function( e ) {
			var $el = $( e.target ),
				key, i,
				id = $el.attr( 'id' ).replace( /\-/g, '.' ),
				dep = dependencyMap[ id ],
				checked = $el.is( ':checked' ),
				list;

			if ( checked ) {
				list = buildCheckListFor( id );
				_.each( list, function( name ) {
					$( '#' + module2domId( name ) ).attr( 'checked', 'checked' );
				});
			} else {
				list = buildUncheckListFor( id );
				_.each( list, function( name ) {
					$( '#' + module2domId( name ) ).removeAttr( 'checked' );
				});
			}
		};

	$.ajax( baseUrl+'/v1/dependencies/jquery/jquery-mobile/master/?baseUrl=js' ).done(
		function( data ) {
			dependencyMap = data;
			// Clean up deps attr from relative paths and plugins
			_.each( dependencyMap, function( value, key, map ) {
				if ( value.group && value.group === "exclude" ) {
					delete map[ key ];
				} else if ( value.deps ) {
					_.each( value.deps, function( v, k, m ) {
						m[ k ] = m[ k ].replace( /^.*!/, "" );  // remove the plugin part
						m[ k ] = m[ k ].replace( /\[.*$/, "" ); // remove the plugin arguments at the end of the path
						m[ k ] = m[ k ].replace( /^\.\//, "" ); // remove the relative path "./"
					});
				}
			});
			buildForm( dependencyMap );
		}
	);

	$( document ).delegate( 'input:checkbox', 'change', resolveDependencies );

	$( "#builder" ).bind( 'submit',
		function( e ) {
			var $el = $( this ),
				formData = $el.find( ':checked' ),
				items = '';

			formData.each( function() {
				items = items + $( this ).attr( 'id' ) + '&';
			});

			$.ajax( {
				url: baseUrl+'/v1/bundle/jquery/jquery-mobile/master/jquery.mobile.custom.js?baseUrl=js&include=' + items.replace( /\-/g, '.' ) + '&pragmasOnSave=%7B%22jqmBuildExclude%22%3Atrue%7D',
				success: function( data ) {
					if ( $( '.builder-output' ).length ) {
						$( '.builder-output' ).text( data );
					} else {
						$el.after( "<textarea class='builder-output'>" + data + "</textarea>" );
					}
				}
			});
			e.preventDefault();
		});
});
