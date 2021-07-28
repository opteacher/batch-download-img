const fs = require('fs')
const toml = require('toml')
const http = require('http')
const https = require('https')
const path = require('path')
const fsPms = require('fs/promises')
const puppeteer = require('puppeteer')

class Puppeteer {
  constructor (configs) {
    this.configs = configs
    this.dftMaxPgs = this.configs.options.maxPgs || 50000
  }

  async start () {
    this.browser = await puppeteer.launch({
      executablePath: this.configs.chromium,
      headless: false
    })
    this.page = await this.browser.newPage()
    this.page.setDefaultNavigationTimeout(600000)
    await this.createDirs(this.configs.download.dldPath)
  }
  

  close () {
    return this.browser.close()
  }

  async createDirs (multPath) {
    try {
      await fsPms.access(multPath, fs.R_OK)
    } catch (e) {
      await fsPms.mkdir(multPath, {recursive: true})
    }
  }

  async viewAllImages () {
    console.log('开始遍历所有图片……')
    this.imgPgs = this.dftMaxPgs
    for (let i = 1; i <= this.imgPgs; ++i) {
      let url = this.configs.urls.images
      if (i === 1 && !this.configs.options.adjstFstPg) {
        url = url.replace(/\[[^\]]+\]/, '')
      } else {
        url = url.replace('[', '')
        url = url.replace(']', '')
        url = url.replace('@', i.toString())
      }
      try {
        await this.viewImage(url)
      } catch (e) {
        console.log(e)
        return Promise.resolve()
      }
    }
  }

  async viewImage (url) {
    console.log(`将跳转到：${url}`)
    const resp = await this.page.goto(url, {
			waitUntil: 'networkidle2' // 等待网络状态为空闲的时候才继续执行
		})
    await this.page.waitForTimeout(this.configs.options.waitPageLoad || 1000)
    if (this.configs.ids.pages && this.imgPgs === this.dftMaxPgs) {
      console.log('获取最大页数……')
      this.imgPgs = Math.max(...await this.page.$$eval(this.configs.ids.pages, els => els.map(el => {
        const page = parseInt(el.innerText)
        return isNaN(page) ? 0 : page
      })))
      console.log(`最大页码数为：${this.imgPgs}`)
    }
    if (this.configs.options.notFound) {
      if (resp.url() === this.configs.options.notFound) {
        console.log('已跳转到无效页面')
        return Promise.reject()
      }
    }
    if (this.configs.ids.title && !this.imgTtl) {
      console.log('获取标题名')
      this.imgTtl = await this.page.$eval(this.configs.ids.title, el => el.innerText)
      console.log(`页面标题为：${this.imgTtl}`)
      this.configs.download.dldPath = path.join(this.configs.download.dldPath, this.imgTtl)
      await this.createDirs(this.configs.download.dldPath)
      console.log(`修改并创建下载文件夹目录为：${this.configs.download.dldPath}`)
    }
    if (this.configs.options.scrollToCen) {
      console.log('滚动到页面中心')
      await this.page.evaluate(() => {
        window.scrollBy(0, document.body.clientHeight >> 1)
      })
    }
    if (this.configs.options.loadingImg) {
      console.log('等待图片加载……')
      await this.page.waitForFunction(param => document.querySelector(param.images).src !== param.loadingImg, {}, {
        images: this.configs.ids.images,
        loadingImg: this.configs.options.loadingImg
      })
    }
    let imgURLs = await this.page.$$eval(this.configs.ids.images, els => els.map(el => ({
      wid: el.width,
      hgt: el.height,
      src: el.src
    })))
    if (this.configs.options.minImgWH && this.configs.options.minImgWH.length === 2) {
      console.log('筛选宽高小于指定最小值的图片')
      const minImgWH = this.configs.options.minImgWH
      imgURLs = imgURLs.filter(el => (el.wid > minImgWH[0] && el.hgt > minImgWH[1]))
    }
    console.log(`搜索到可下载的图片数：${imgURLs.length}`)
    try {
      for (const imgURL of imgURLs.map(img => img.src)) {
        console.log(`下载图片：${imgURL}`)
        await this.dwnldImage(imgURL)
      }
    } catch (e) {
      console.log(e)
      return Promise.reject(e)
    }
    return Promise.resolve()
  }

  multiRequest (url, num, init, callback, options) {
    http.get(url, function(res) {
      var html = ''
  
      if(init && init != null) { init(res) }
  
      res.on('data', function(data) {
        html += data
      })
  
      res.on('end', function() {
        callback(null, html, options)
      })
    }).on('error', function() {
      console.log('Cant get response from URL, ' +
        `start the next request, rest num ${num--}`)
      if(num > 0) {
        this.multiRequest(url, num, null, callback, options)
      } else {
        const errMsg = 'Cant connect to the url, please check the internet'
        console.log(errMsg)
        callback(new Error(errMsg), null, options)
      }
    })
  }

  async dwnldImage (imgURL) {
    const imgNam = imgURL.split('/').pop()
    const dldFiles = this.configs.download.dldFiles
    if(typeof dldFiles === 'string') {
      if(dldFiles !== '*' && dldFiles !== imgNam) {
        return
      }
    } else {
      if(!dldFiles.includes(imgNam)) {
        return
      }
    }

    const imgData = await new Promise((resolve, reject) => {
      this.multiRequest(imgURL, 5, function(res) {
        res.setEncoding('binary')
      }, (err, img) => {
        err ? reject(err) : resolve(img)
      })
    })

    const dlFlPath = path.join(this.configs.download.dldPath, imgNam)
    return fsPms.writeFile(dlFlPath, imgData, 'binary')
  }
}

(async () => {
  const ppr = new Puppeteer(toml.parse(fs.readFileSync('./configs.toml', {encoding: 'utf8'})))
  await ppr.start()
  await ppr.viewAllImages()
  await ppr.close()
})()