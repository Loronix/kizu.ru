// We'll need to render stuff inside our stuff
marked = require('marked');

var handleAttributes = function(args) {
    var content = args.original.text && 'text' || 'code';

    var customAttributes = args.original[content].match(/\s*\{:?([#.][^}]+|[a-z-]+=(?:['"]|&quot;|&#39;)[^}]*)\}\s*$/);

    if (customAttributes) {
        args.original[content] = args.original[content].substr(0, args.original[content].length - customAttributes[0].length);
        customAttributes = customAttributes[1];
        var customClasses = customAttributes.match(/\.([^\s#.]+)/g);
        var customID = customAttributes.match(/#(?!39;)([^\s.]+)/g);
        customAttributes = customAttributes.match(/[a-z-]+=(['"]|&quot;|&#39;).*\1/g);

        if (customID) {
            args.attributes.id = customID[0].substr(1);
            args.hasCustomID = true;
        }
        if (customClasses) {
            for (var i = 0; i < customClasses.length; i++) {
                args.attributes.class+= ' ' + customClasses[i].substr(1)
            }
        }
        if (customAttributes) {
            for (var i = 0; i < customAttributes.length; i++) {
                var customAttributeName = customAttributes[i].match(/[a-z-]+/)[0];
                var customAttributeValue = customAttributes[i].match(/\=(['"]|&quot;|&#39;)(.*)\1/)[2];

                if (customAttributeName != 'class') {
                    args.attributes[customAttributeName] = customAttributeValue;
                } else {
                    args.attributes.class+= ' ' + customAttributeValue;
                }
            }
        }
    }
    return args;
}

module.exports = {
    'paragraph': [
        function(args) { return handleAttributes(args); }
    ],

    'code': [
        function(args) { return handleAttributes(args); }
    ],

    heading: [
        function(args) { return handleAttributes(args); },
        function(args) {
            // Apply linkless links as spans with classes
            args.original.text = args.original.text.replace(/\[([^\]]+)\]\[([^\s\]]+(?:\s+[^\s\]]+)*)\]/g, '<span class="$2">$1</span>');
            return args;
        },
        function(args) {
            // Apply typographic classes to first letters
            if (args.original.text[0].match(/[A-ZА-Я“«]/)) {
                var firstLetter = args.original.text[0];
                var hang = 'm';
                var alt = 'ss01 ';

                if ('СC'.indexOf(firstLetter) > -1) {
                    alt = 'ss02 ';
                }
                if ('КТ'.indexOf(firstLetter) > -1) {
                    alt = 'ss04 ';
                }
                if ('“'.indexOf(firstLetter) > -1) {
                    alt = '';
                }

                if ('АAФДЗОOЖЭЯQSGZCС'.indexOf(firstLetter) > -1) {
                    hang = 'xs';
                }
                if ('Ч'.indexOf(firstLetter) > -1) {
                    hang = 'l';
                }

                // Disabled as when centering it would look bad.
                // TODO: pass a param there for alignment, then maybe wrap the last chars too if centering.
                // if ('“«'.indexOf(firstLetter) > -1) {
                //     hang = 'quote';
                // }

                firstLetter = '<span class="' + alt + 'hang-' + hang + '">' + firstLetter + '</span>';
                args.original.text = firstLetter + args.original.text.slice(1);
            }
            return args;
        },
        function(args) {
            // Proper headers with cyrillic symbols
            if (!args.hasCustomID) {
                args.attributes.id = args.original.text.replace(/<(?:.|\n)*?>/gm, '').toLowerCase().replace(/[^a-zа-я0-9_]+/g, '-');
            }
            return args;
        },
        function(args) {
            // Adding anchors
            args.beforeContent = '<a class="Header-Anchor" href="#' + args.attributes.id + '"></a>';
            return args;
        }

    ],

    'link': [
        function(args) {
            // Adding `link` class
            args.attributes.class += ' Link';
            return args;
        },
        function(args) {
            // Handling `@username` twitter links
            args.attributes.href = args.attributes.href.replace(/^@/, 'https://twitter.com/');
            return args;
        },
        function(args) {
            // Handling `gh:username` GitHub links
            args.attributes.href = args.attributes.href.replace(/^gh:/, 'https://github.com/');
            return args;
        },
        function(args) {
            // Wrapping quoted link content for better underlines
            initialText = args.original.text;
            args.original.text = args.original.text.replace(/^“([^”]+)”$/, '“<span class="Link-Inner">$1</span>”');
            args.original.text = args.original.text.replace(/^«([^»]+)»$/, '«<span class="Link-Inner">$1</span>»');
            if (initialText != args.original.text) {
                args.attributes.class += ' Link_wrapper';
            }
            return args;
        },
        function(args, options) {
            // Creating sidenotes for `href`s starting with `*`
            if (args.original.href[0] == '*') {
                id = args.original.href.substr(1);

                args.before += '<span class="Sidenote-Wrapper">';

                args.attributes.class = 'Sidenote-Context';
                args.attributes.id = id;
                args.attributes.href = '#' + id;

                args.after  +=     '<span class="Sidenote">';
                args.after  +=         '<span class="Sidenote-Misc"> (</span>';
                args.after  +=         marked(args.original.title, options).replace(/^\s*<p(?: class="")?>\s*([\s\S]*\S)\s*<\/p>\s*$/, '$1');
                args.after  +=         '<span class="Sidenote-Misc">)</span>';
                args.after  +=     '</span>';

                args.after  +=     '<a class="Sidenote-Close" href="#x"></a>';
                args.after  += '</span>';

                args.attributes.title = null;
            }
            return args;
        }
    ]
};