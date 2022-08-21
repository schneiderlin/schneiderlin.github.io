hexo.extend.tag.register('video', function (args) {
    const url = args[0]

    return `
        <div style="position: relative;width: 100%;height: 0;padding-bottom: 75%;">
            <iframe src="${url}" 
                scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"
                style="width: 100%; height: 100%; position: absolute"> 
            </iframe>
        </div>
    `

});