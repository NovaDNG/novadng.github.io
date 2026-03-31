/**
 * 当 DOM 加载完成后初始化 FancyBox
 */
document.addEventListener('DOMContentLoaded', function () {
    wrapImageWithFancyBox();
});

/**
 * 为博客文章中的图片添加 FancyBox 支持
 */
function wrapImageWithFancyBox() {
    try {
        // 只选择文章中的图片
        const images = document.querySelectorAll(`article img`);
        // 这里可以根据需要修改选择器，比如可以用 ":not()" 排除一些图片

        console.log(images);

        images.forEach(function (image) {
            // 获取图片标题
            const imageCaption = image.getAttribute('alt');
            // 检查图片是否已经被链接包裹
            let imageWrapLink = image.closest('a');

            // 如果图片还没有被链接包裹，创建新的包裹链接
            if (!imageWrapLink) {
                let src = image.getAttribute('src');
                // 移除 URL 中的查询参数
                const idx = src.lastIndexOf('?');
                if (idx !== -1) {
                    src = src.substring(0, idx);
                }

                // 创建新的链接元素并包裹图片
                imageWrapLink = document.createElement('a');
                imageWrapLink.href = src;
                image.parentNode.insertBefore(imageWrapLink, image);
                imageWrapLink.appendChild(image);
            }

            // 设置 FancyBox 属性
            imageWrapLink.setAttribute('data-fancybox', 'images');
            if (imageCaption) {
                imageWrapLink.setAttribute('data-caption', imageCaption);
            }
        });

        // 初始化 FancyBox
        if (typeof Fancybox !== 'undefined') {
            Fancybox.bind('[data-fancybox="images"]', {
                Images: {
                    // 图片相关设置
                    zoom: false,
                },
                Toolbar: {
                    display: [
                        "zoom",
                        "slideshow",
                        "fullscreen",
                        "close"
                    ],
                },
                Thumbs: {
                    autoStart: false,  // 禁用缩略图
                },
                Hash: true,            // 启用 URL hash（不知道有没有用）
                infinite: false,       // 禁用循环浏览
            });
        } else {
            console.warn('FancyBox is not loaded');
        }
    } catch (error) {
        console.error('Error initializing FancyBox:', error);
    }
}