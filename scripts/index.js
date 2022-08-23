hexo.extend.tag.register('bilibili', function (args) {
    const url = args[0]

    return `
        <div style="position: relative;width: 100%;height: 0;padding-bottom: 75%;">
            <iframe src="${url}" 
                scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"
                style="width: 100%; height: 100%; position: absolute"> 
            </iframe>
        </div>
    `
})

hexo.extend.tag.register('mov', function (args) {
    const path = args[0]

    return `<video width="320" height="240" src="${this.path + path}"></video>`

    // <video width="400" controls autoplay>
    //         <source src="${this.path + path}" type="video/mp4">
    //     </video>
})