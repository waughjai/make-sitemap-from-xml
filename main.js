const WriteFile = require( 'fs' ).writeFile;
const Request = require( 'request' );
const PromiseRequest = require( 'request-promise-native' );
const Cheerio = require( 'cheerio' );
const ParseString = require( 'xml2js' ).parseString;
const Sitemap = process.argv[ 2 ];
const Promises = [];
const FileToWrite = `${ process.cwd() }/output.html`;

const LoadLink = function( Link )
{
	return function( Body )
	{
		const Value = { title: null, description: null, link: Link, canonical: null };
		const $ = Cheerio.load( Body );
		Value.title = $( 'title' ).text();
		$( 'meta' ).each
		(
			function()
			{
				if ( $( this ).attr( 'name' ) === 'description' )
				{
					const Description = $( this ).attr( 'value' );
					Value.description = Description;
				}
			}
		);
		$( 'link' ).each
		(
			function()
			{
				if ( $( this ).attr( 'rel' ) === 'canonical' )
				{
					const Canonical = $( this ).attr( 'href' );
					Value.canonical = Canonical;
				}
			}
		);
		return Value;
	};
};

const GetValues = function( Values )
{
	let Text = '';
	for ( Value of Values )
	{
		const Canonical = ( Value.canonical === null )
			? '[No Canonical Link]'
			: `<a href="${ Value.canonical }">${ Value.canonical }</a>`;

		Text +=
		`
			<div class="item">
				<h2>${ ( Value.title === null ) ? '[No Title]' : Value.title }</h2>
				<p>${ ( Value.description === null ) ? '[No Description]' : Value.description }</p>
				<p>Canonical Link: ${ Canonical }</p>
				<p><a href="${ Value.link }">${ Value.link }</a></p>
			</div>
		`;
	}
	return Text;
};

const Finish = function( Values )
{
	WriteFile
	(
		FileToWrite,
		`
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="utf-8">
				</head>
				<body>
					${ GetValues( Values ) }
				</body>
			</html>
		`,
		function( Error )
		{
			if ( Error ) { throw Error; }
		}
	);
};

Request
(
	Sitemap,
	function ( Error, Response, Body )
	{
		if ( Error )
		{
			throw Error;
		}
		else if ( !Response )
		{
			throw "No response";
		}
		else
		{
			if ( Response.statusCode !== 200 )
			{
				throw `Invalid status code: ${ Response.statusCode }`;
			}
			else
			{
				ParseString
				(
					Body,
					function ( Error, Result )
					{
						if ( 'urlset' in Result && 'url' in Result.urlset )
						{
							for ( const Location of Result.urlset.url )
							{
								const Link = Location.loc[ 0 ];
								Promises.push( PromiseRequest( Link ).then( LoadLink( Link ) ).catch( function( Error ) { console.log( Error ); } ) );
								console.log( Link );
							}
							Promise.all( Promises ).then( Finish );
						}
						else
						{
							throw "Can't find URLs.";
						}
					}
				);
			}
		}
	}
)
