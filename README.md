# batch-download-img

【爬虫】批量下载图片

配置为configs.toml，定义在根目录下，参数说明如下：
```
chromium = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" # chrome的执行文件（带目录）
[urls]
  images = "http://xx.com/first_page[_@].html" # 浏览图片的第一页网页链接。其中自增页码以@标识，指定页码部分内容包含在[]中
[ids]
  images = ".main img" # 图片的selector
  title = ".title" # 图片集的标题。如果不定义该参数，图片将直接放在dldPath下
  pages = ".pages a" # 页码的selector，和options.notFoudPage互斥出现，定义页码控件的id
[download]
  dldFiles = "*" # 图片筛选器
  dldPath = "/images/" # 图片下载目录
[options]
  adjstFstPg = true # 是否修改第一页URL的页码。如果为false，则方括号内的内容删除后作为第一页
  scrollToCen = true # 是否滚动到页面中心，有些站点需要滚动激活图片加载
  notFoudPage = "http://xx.com/404.html" # 如果定义该参数，那爬虫将不再寻找最大页码，而是直接下一页直到跳转到该URL
  loadingImg = "http://xx.com/loading.gif" # 如果定义该参数，爬虫将在图片页等待图片加载到src属性变为非该参数为止
  minImgWH = [300, 300] # 收集图片的最小尺寸，数组第一位是宽，第二位是高
  maxPgs = 1 # 最大页数
  waitPageLoad = 1200000 # 单页等待时间（用于有的站点设置的人工审核机制）
```