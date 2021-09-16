'use strict';

const build = require('@microsoft/sp-build-web');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);

//add start from https://n8d.at/how-to-bundle-and-use-custom-web-fonts-in-spfx-projects

// Font loader configuration for webfonts
const fontLoaderConfig = {
    test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
    use: [{
        loader: 'file-loader',
        options: {
            //name: '[name].[ext]',
            name: '[name]_[sha1:hash:hex:8].[ext]',
            outputPath: 'fonts/'
        }
    }]
};

// Merge custom loader to web pack configuration
build.configureWebpack.mergeConfig({
    additionalConfiguration: (generatedConfiguration) => {

        generatedConfiguration.module.rules.push(fontLoaderConfig);

        return generatedConfiguration;

    }

});
//add end

build.initialize(require('gulp'));
