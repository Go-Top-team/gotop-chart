var Basic = {
  OrignDatas: {

  },
  SignalDatas: [],
  SignalIndex: null,
  period: 1, // 1 5 15 30 60   显示分钟数，一天的话就是24小时*60 = 1440  
  curMsgContainerHeight: 50,
  yAxisWidth: 50,
  xAxisHeight: 30,
  chartPd: 10,
  kLineWidth: 2,
  kLineMarginRight: 2,
  signWidth: 20,
  canvasPaddingLeft: 10,
  signR: 15,
  upColor: '#26a69a',
  downColor: '#ef5350',
  buySignBg: '#4fc3f78c',
  sellSignBg: '#fdd8359e',
  volUpColor: 'rgba(38,166,154,0.5)',
  volDownColor: 'rgba(239,83,80,0.5)',
}

var IndicatorsList = [{
  name: 'vol',
},
{
  name: 'macd',
  style: {
    DIFF: '#fa5252',
    DEA: '#5f5fff',
    MACD: {
      'up': '#26a69a',
      'down': '#fa5252'
    }
  }
},
{
  name: 'rsi',
  style: {
    RSI6: '#f71c17',
    RSI12: '#0680e0',
    RSI24: '#04477b'
  }
},
{
  name: 'asi',
  style: {
    ASI: '#f71c17',
    ASIT: '#0680e0',
  }
}
]

function QTChart (divElement) {
  this.DivElement = divElement;
  this.TopToolContainer = new TopToolContainer()
  this.TopToolDiv = this.TopToolContainer.Create()
  this.DivElement.appendChild(this.TopToolDiv)

  this.CanvasElement = document.createElement("canvas");
  this.CanvasElement.className = 'jschart-drawing';
  this.CanvasElement.setAttribute("tabindex", 0);
  this.CanvasElement.id = Guid();

  this.OptCanvasElement = document.createElement("canvas");
  this.OptCanvasElement.className = 'jschart-opt-drawing';
  this.OptCanvasElement.id = Guid();

  this.DivElement.appendChild(this.CanvasElement);
  this.DivElement.appendChild(this.OptCanvasElement);

  this.Canvas = this.CanvasElement.getContext('2d')
  this.OptCanvas = this.OptCanvasElement.getContext('2d')
  this.isDrag = false
  this.MoveStartX = null
  this.MoveEndX = null
  this.MouseDrag
  this.StepPixel = 4
  this.FrameToolIds = [] //frame tool 的ID集
  this.ChartObjArray = []
  var _self = this
  this.BindEvents = function () {
    $("#go-date").click(
      function (e) {
        var inputText = $("#dateinput").val()
        scrollFun(inputText)
      }
    );
    $("#indicators-btn").click(
      function (e) {
        if (_self.IndicatorsDialog) {
          _self.IndicatorsDialog.style.display = 'block'
        } else {
          _self.CreateIndicatorsDialog(e.currentTarget.offsetLeft)
        }
      }
    )
    // 保存买卖点
    $('#save-signal-btn').click(
      function (e) {
        saveJsonToFile(_self.ChartArray[0].signalDatas, 'buySellSign')
      }
    )
    // 上一个买卖点
    $('#pre-signal-btn').click(
      function (e) {
        if (Basic.SignalIndex == null) {
          Basic.SignalIndex = Basic.SignalDatas.length - 1
        } else {
          Basic.SignalIndex != 0 ? Basic.SignalIndex-- : Basic.SignalIndex == 0
        }
        scrollFun(Basic.SignalDatas[Basic.SignalIndex].datetime)
      }
    )
    // 下一个买卖点
    $('#next-signal-btn').click(
      function (e) {
        if (Basic.SignalIndex == null) {
          Basic.SignalIndex = Basic.SignalDatas.length - 1
        } else {
          Basic.SignalIndex != Basic.SignalDatas.length - 1 ? Basic.SignalIndex++ : Basic.SignalIndex == Basic.SignalDatas.length - 1
        }
        scrollFun(Basic.SignalDatas[Basic.SignalIndex].datetime)
      }
    )
    // 切换周期
    $('#period-select').change(function () {
      Basic.period = $('#period-select').val()
      _self.Canvas.clearRect(0, 0, Basic.width, Basic.height)
      option = {
        chartArray: _self.ChartArray
      }
      _self.SetOption(option)
    })
    $('#period-select').val(Basic.period)
    var scrollFun = function (inputText) {
      var datas = Basic.OrignDatas.kline
      if (!datas) return
      var scrollKIndex = 0
      for (var i in datas) {
        let lastD = null
        let lastTimeStamp = null
        const kD = new Date(datas[i].datetime)
        const scrollToDate = new Date(inputText)
        if (i > 0) {
          lastD = new Date(datas[i - 1].datetime)
          lastTimeStamp = lastD.getTime(lastD) / 1000
        }
        const kTimeStamp = kD.getTime(kD) / 1000
        const sDTimeStamp = scrollToDate.getTime(scrollToDate) / 1000
        if (kTimeStamp === sDTimeStamp) {
          scrollKIndex = i
          break
        } else if (i !== 0 && lastTimeStamp === sDTimeStamp) {
          scrollKIndex = i
          break
        } else if (kTimeStamp > sDTimeStamp && i !== 0 && sDTimeStamp > lastTimeStamp) {
          scrollKIndex = i
          break
        }
      }
      scrollKIndex = parseInt(scrollKIndex)
      if (scrollKIndex >= Basic.OrignDatas.kline.length - 1) {
        _self.DataCurIndex = Basic.OrignDatas.kline.length - 1
        _self.DataPreIndex = _self.DataCurIndex - Basic.ScreenKNum
      } else if (scrollKIndex <= Basic.ScreenKNum - 1) {
        _self.DataCurIndex = Basic.ScreenKNum - 1
        _self.DataPreIndex = 0
      } else {
        _self.DataCurIndex = scrollKIndex
        _self.DataPreIndex = scrollKIndex - Basic.ScreenKNum + 1
      }
      _self.SetUpdate()
    }
  }
  // 窗口初始化
  this.OnSize = function () {
    //画布大小通过div获取
    var height = parseInt(this.DivElement.style.height.replace("px", ""));
    if (this.TopToolDiv) {
      //TODO调整工具条大小
      height -= this.TopToolDiv.style.height.replace("px", ""); //减去工具条的高度
    }

    this.CanvasElement.height = height;
    this.CanvasElement.width = parseInt(this.DivElement.style.width.replace("px", ""));
    this.CanvasElement.style.width = this.CanvasElement.width + 'px';
    this.CanvasElement.style.height = this.CanvasElement.height + 'px';

    this.OptCanvasElement.height = height
    this.OptCanvasElement.width = parseInt(this.DivElement.style.width.replace("px", ""))
    this.OptCanvasElement.style.width = this.OptCanvasElement.width + 'px';
    this.OptCanvasElement.style.height = this.OptCanvasElement.height + 'px';

    var pixelTatio = GetDevicePixelRatio(); //获取设备的分辨率，物理像素与css像素的比值
    Basic.pixelTatio = pixelTatio

    Basic.curMsgContainerHeight = pixelTatio * 50
    Basic.yAxisWidth = pixelTatio * 50
    Basic.xAxisHeight = pixelTatio * 30
    Basic.chartPd = pixelTatio * 10
    Basic.kLineWidth = pixelTatio * 8
    Basic.kLineMarginRight = pixelTatio * 3
    Basic.signWidth = pixelTatio * 20
    Basic.canvasPaddingLeft = pixelTatio * 10
    Basic.signR = pixelTatio * 15

    this.CanvasElement.height *= pixelTatio;
    this.CanvasElement.width *= pixelTatio;
    this.OptCanvasElement.height *= pixelTatio;
    this.OptCanvasElement.width *= pixelTatio;


    Basic.width = this.CanvasElement.width
    Basic.height = this.CanvasElement.height
    this.BindEvents()
  }
  this.ChangePeriod = function (chartArray) {
    if (Basic.period == 1) {
      kLines1 && (chartArray[0].datas = kLines1)
      bi1 && (chartArray[0].topLowDatas = bi1)
      centre1 && (chartArray[0].centreDatas = centre1)
      duan1 && (chartArray[0].xianDuanDatas = duan1)
      signals1 && (chartArray[0].signalDatas = signals1)
      kLines1 && (chartArray[1].datas = kLines1)
    } else if (Basic.period == 5) {
      kLines5 && (chartArray[0].datas = kLines5)
      bi5 && (chartArray[0].topLowDatas = bi5)
      centre5 && (chartArray[0].centreDatas = centre5)
      duan5 && (chartArray[0].xianDuanDatas = duan5)
      signals5 && (chartArray[0].signalDatas = signals5)
      kLines5 && (chartArray[1].datas = kLines5)
    } else if (Basic.period == 15) {
      kLines15 && (chartArray[0].datas = kLines15)
      bi15 && (chartArray[0].topLowDatas = bi15)
      centre15 && (chartArray[0].centreDatas = centre15)
      duan15 && (chartArray[0].xianDuanDatas = duan15)
      kLines15 && (chartArray[1].datas = kLines15)
    } else if (Basic.period == 30) {
      kLines30 && (chartArray[0].datas = kLines30)
      bi30 && (chartArray[0].topLowDatas = bi30)
      centre30 && (chartArray[0].centreDatas = centre30)
      duan30 && (chartArray[0].xianDuanDatas = duan30)
      kLines30 && (chartArray[1].datas = kLines30)
    }
    return chartArray
  }
  // 设置配置
  this.SetOption = function (options) {
    this.ChartArray = this.ChangePeriod(options.chartArray.sort(sortBy('index')))
    this.CalCHeightRatio()
    this.CalculationIndicators()
    var canvasHeight = Basic.height
    var addHeight = 0
    // 计算各个图表在Canvas中的位置坐标
    for (var j in this.ChartArray) {
      // this.ChartArray[j].name == 'kline' && (Basic.OrignDatas = this.ChartArray[j].datas)
      Basic.OrignDatas[this.ChartArray[j].name] = this.ChartArray[j].datas
      this.ChartArray[j].cHeight = (canvasHeight - Basic.xAxisHeight) * this.ChartArray[j].cHeightRatio
      this.ChartArray[j].cStartX = 0
      this.ChartArray[j].cStartY = addHeight
      this.ChartArray[j].cEndX = Basic.width
      this.ChartArray[j].cEndY = this.ChartArray[j].cHeight + addHeight
      addHeight += this.ChartArray[j].cHeight
    }
    this.CreateFrameTool()
    this.CalSceenKNum()
    this.DataPreIndex = Basic.OrignDatas.kline.length - Math.floor(Basic.ScreenKNum)
    this.DataCurIndex = Basic.OrignDatas.kline.length - 1
    this.SplitDatas(this.DataPreIndex, this.DataCurIndex)
    this.Draw()
    for (var i in this.ChartArray[0].signalDatas) {
      const item = {
        datetime: i,
        type: this.ChartArray[0].signalDatas[i]
      }
      Basic.SignalDatas.push(item)
    }
  }
  this.CalculationIndicators = function (indicatorName) {
    var datas
    if (Basic.OrignDatas['kline']) {
      datas = Basic.OrignDatas['kline']
    } else {
      datas = this.ChartArray[0].datas
    }

    if (indicatorName && indicatorName != 'kline' && indicatorName != 'vol') {
      var c = hxc3.IndicatorFormula.getClass(indicatorName);
      var indicator = new c();
      var iDatas = indicator.calculate(datas);
      return iDatas
    }

    for (var j in this.ChartArray) {
      if (this.ChartArray[j].name != 'kline' && this.ChartArray[j].name != 'vol') {
        var c = hxc3.IndicatorFormula.getClass(this.ChartArray[j].name);
        var indicator = new c();
        var iDatas = indicator.calculate(datas);
        this.ChartArray[j].datas = iDatas
      }
    }
  }
  this.AddChart = function (option) {
    option.index = this.ChartArray.length
    Basic.OrignDatas[option.name] = option.datas
    this.ChartArray.push(option)
    this.CalCHeightRatio()
    var canvasHeight = Basic.height
    var addHeight = 0
    for (var j in this.ChartArray) {
      this.ChartArray[j].cHeight = (canvasHeight - Basic.xAxisHeight) * this.ChartArray[j].cHeightRatio
      this.ChartArray[j].cStartX = 0
      this.ChartArray[j].cStartY = addHeight
      this.ChartArray[j].cEndX = Basic.width
      this.ChartArray[j].cEndY = this.ChartArray[j].cHeight + addHeight
      addHeight += this.ChartArray[j].cHeight
    }
    this.DelFrameTool()
    this.CreateFrameTool()
    this.CalSceenKNum()
    this.DataPreIndex = this.DataCurIndex + 1 - Math.floor(Basic.ScreenKNum)
    this.SplitDatas(this.DataPreIndex, this.DataCurIndex)
    this.Canvas.clearRect(0, 0, Basic.width, Basic.height)
    this.Draw()
  }
  this.RemoveChart = function (option, i) {
    this.ChartArray.splice(i, 1)
    this.CalCHeightRatio()
    var canvasHeight = Basic.height
    var addHeight = 0
    for (var j in this.ChartArray) {
      this.ChartArray[j].cHeight = (canvasHeight - Basic.xAxisHeight) * this.ChartArray[j].cHeightRatio
      this.ChartArray[j].cStartX = 0
      this.ChartArray[j].cStartY = addHeight
      this.ChartArray[j].cEndX = Basic.width
      this.ChartArray[j].cEndY = this.ChartArray[j].cHeight + addHeight
      addHeight += this.ChartArray[j].cHeight
    }
    this.DelFrameTool()
    this.CreateFrameTool()
    this.CalSceenKNum()
    this.DataPreIndex = this.DataCurIndex + 1 - Math.floor(Basic.ScreenKNum)
    this.OptCanvas.clearRect(0, 0, Basic.width, Basic.height)
    this.SetUpdate()
  }
  this.CalCHeightRatio = function () {
    var kratio = 1 / this.ChartArray.length * 2
    var oratio = (1 - kratio) / (this.ChartArray.length - 1)
    for (var i in this.ChartArray) {
      if (this.ChartArray[i].name == 'kline') {
        kratio == 1 ? (this.ChartArray[i]['cHeightRatio'] = 0.7) : (this.ChartArray[i]['cHeightRatio'] = kratio)
        kratio == 2 && (this.ChartArray[i]['cHeightRatio'] = 1)
      } else {
        kratio == 1 ? (this.ChartArray[i]['cHeightRatio'] = 0.3) : (this.ChartArray[i]['cHeightRatio'] = oratio)
      }
    }
  }
  // 客户端窗口改动
  this.SetOnSizeChange = function () {
    var canvasHeight = Basic.height
    var addHeight = 0
    for (var j in this.ChartArray) {
      this.ChartArray[j].cHeight = (canvasHeight - Basic.xAxisHeight) * this.ChartArray[j].cHeightRatio
      this.ChartArray[j].cStartX = 0
      this.ChartArray[j].cStartY = addHeight
      this.ChartArray[j].cEndX = Basic.width
      this.ChartArray[j].cEndY = this.ChartArray[j].cHeight + addHeight
      addHeight += this.ChartArray[j].cHeight
    }
    this.DelFrameTool()
    this.CreateFrameTool()
    this.CalSceenKNum()
    this.DataPreIndex = this.DataCurIndex + 1 - Math.floor(Basic.ScreenKNum)
    // this.DataCurIndex = Basic.OrignDatas.kline.length - 1
    this.SetUpdate()
  }
  // 数据截取
  this.SplitDatas = function (pre, cur) {
    for (var i in this.ChartArray) {
      if (!cur || cur >= Basic.OrignDatas.kline.length - 1) {
        this.ChartArray[i].datas = Basic.OrignDatas[this.ChartArray[i].name].slice(pre)
      } else if (pre >= 0) {
        this.ChartArray[i].datas = Basic.OrignDatas[this.ChartArray[i].name].slice(pre, cur + 1)
      }
    }
  }
  // 指标数据截取
  this.SplitIndicatorsDatas = function (pre, cur) {
    if (!cur || cur >= Basic.OrignDatas.kline.length - 1) {
      this.IndicatorDatas = Basic.OrignDatas['kline'].slice(pre)
    } else if (pre >= 0) {
      this.IndicatorDatas = Basic.OrignDatas['kline'].slice(pre, cur + 1)
    }
  }
  // 计算当前屏幕可容纳多少根k线
  this.CalSceenKNum = function () {
    Basic.ScreenKNum = Math.floor((Basic.width - Basic.yAxisWidth - Basic.canvasPaddingLeft) / (Basic.kLineWidth + Basic.kLineMarginRight))
  }
  // 更新画布
  this.SetUpdate = function () {
    this.SplitDatas(this.DataPreIndex, this.DataCurIndex)
    this.Canvas.clearRect(0, 0, Basic.width, Basic.height)
    // this.OptCanvas.clearRect(0, 0, Basic.width, Basic.height) //这里不能加，不然导致拖动的时候curMsg没有显示
    for (var i in this.ChartArray) {
      switch (this.ChartArray[i].name) {
        case 'kline':
          this.xAxisChart.SetUpdateXAxis(this.ChartArray[i])
          // this.ChartArray[i].topLowDatas = this.TopLow.Calculate(this.IndicatorDatas)
          this.ChartArray[i].yRange = this.kLineChart.SetUpdateKLineChart(this.ChartArray[i])
          break;
        case 'vol':
          this.ChartArray[i].yRange = this.volChart.SetUpdateVol(this.ChartArray[i])
          break;
        case 'macd':
          this.ChartArray[i].yRange = this.macdChart.SetUpdateMACDChart(this.ChartArray[i])
          break;
        case 'rsi':
          this.ChartArray[i].yRange = this.rsiChart.SetUpdateRSIChart(this.ChartArray[i])
          break;
        case 'asi':
          this.ChartArray[i].yRange = this.asiChart.SetUpdateASIChart(this.ChartArray[i])
          break;
        case 'kdj':
          this.ChartArray[i].yRange = this.kdjChart.SetUpdateASIChart(this.ChartArray[i])
          break;
      }
    }
  }
  // 鼠标拖动
  this.OnMouseMove = function (start, end) {
    var pre = this.DataPreIndex
    var cur = this.DataCurIndex
    var dataStep = parseInt(end - start)

    if (dataStep > 0) {
      // 画布向右拖动，数据往左移动
      pre != 0 && (pre -= Math.ceil(8 / Basic.kLineWidth), cur -= Math.ceil(8 / Basic.kLineWidth))
    } else if (dataStep < 0) {
      // 画布向左拖动，数据往右移动
      cur != Basic.OrignDatas.kline.length - 1 && (cur += Math.ceil(8 / Basic.kLineWidth), pre += Math.ceil(8 / Basic.kLineWidth))
    }
    this.DataPreIndex = pre
    this.DataCurIndex = cur
    this.SetUpdate()
    if (pre == this.DataPreIndex || cur == this.DataCurIndex) return
  }
  // 事件监听
  this.OptCanvasElement.onmousemove = function (e) {
    var pixelTatio = GetDevicePixelRatio();
    _self.onDrawCursor(e.offsetX, e.offsetY)
    if (!this.isDrag) {
      return
    }
    _self.OnMouseMove(this.MoveStartX, e.clientX * pixelTatio)
    this.MoveStartX = e.clientX * pixelTatio
  }
  this.OptCanvasElement.onmousedown = function (e) {
    this.isDrag = true
    this.MoveStartX = e.clientX
  }
  this.OptCanvasElement.onmouseup = function (e) {
    this.isDrag = false
  }
  this.OptCanvasElement.onmousewheel = function (e) {
    _self.onKLineScale(e.wheelDelta)
  }
  this.OptCanvasElement.ondblclick = function (e) {
    var x = e.x
    var y = e.y
    x *= Basic.pixelTatio
    y *= Basic.pixelTatio
    if (_self.ChartArray[0].signalDatas[Basic.OrignDatas.kline[_self.DataPreIndex + _self.cur_kn - 1]['datetime']]) {
      _self.CreateDlbDialog(x, y, true)
    } else {
      _self.CreateDlbDialog(x, y, false)
    }
    // if (Basic.OrignDatas.kline[_self.DataPreIndex + _self.cur_kn - 1]['signal']) {
    //   _self.CreateDlbDialog(x, y, true)
    // } else {
    //   _self.CreateDlbDialog(x, y, false)
    // }
  }
  // 创建每个窗口的操作工具  关闭按钮、更换指标
  this.CreateFrameTool = function () {
    for (var i in this.ChartArray) {
      var frameTool = document.createElement('i')
      frameTool.className = 'iconfont icon-close-b'
      frameTool.id = Guid()
      this.FrameToolIds.push(frameTool.id)
      frameTool.style.position = 'absolute'
      frameTool.style.top = parseInt(this.TopToolDiv.style.height.replace("px", "")) + (this.ChartArray[i].cStartY / Basic.pixelTatio) + 1 + 'px'
      frameTool.style.left = 10 + 'px'
      frameTool.style.zIndex = 3
      frameTool.style.fontSize = 20 + 'px'
      frameTool.dataset.id = i
      this.DivElement.appendChild(frameTool)
      $("#" + frameTool.id).click(function () {
        var option = _self.ChartArray[this.dataset.id]
        _self.RemoveChart(option, this.dataset.id)
      })
    }
  }
  // 删除每个窗口的操作工具 关闭鞍鼻、更换指标
  this.DelFrameTool = function () {
    for (var i in this.FrameToolIds) {
      this.DivElement.removeChild(document.getElementById(this.FrameToolIds[i]))
    }
    this.FrameToolIds = []
  }
  // 创建鼠标双击窗口
  this.CreateDlbDialog = function (x, y, is_exist) {
    if (this.DLBDialog) {
      this.DivElement.removeChild(this.DLBDialog)
    }
    var dialog = document.createElement('div')
    dialog.className = "dlbclick-dialog"
    dialog.id = Guid()
    dialog.style.position = 'absolute'
    dialog.style.top = y + 'px'
    dialog.style.left = x + 'px'
    dialog.style.zIndex = 3
    dialog.style.fontSize = 18 + 'px'
    this.DLBDialog = dialog
    this.DivElement.appendChild(this.DLBDialog)
    var item = document.createElement('div')
    item.className = "dlbclick-dialog_item"
    item.id = Guid()
    item.innerText = '插入买点'
    item.dataset.id = 'buy'
    if (is_exist) {
      item.style.display = 'none'
    }
    this.DLBDialog.appendChild(item)
    var item1 = document.createElement('div')
    item1.className = "dlbclick-dialog_item"
    item1.id = Guid()
    item1.innerText = '插入卖点'
    item1.dataset.id = 'sell'
    if (is_exist) {
      item1.style.display = 'none'
    }
    this.DLBDialog.appendChild(item1)
    var del = document.createElement('div')
    del.className = "dlbclick-dialog_item"
    del.id = Guid()
    del.innerText = '删除信号'
    del.dataset.id = 'del'
    if (!is_exist) {
      del.style.display = 'none'
    }
    this.DLBDialog.appendChild(del)
    var cancel = document.createElement('div')
    cancel.className = "dlbclick-dialog_item"
    cancel.id = Guid()
    cancel.innerText = '取消操作'
    cancel.dataset.id = 'cancel'
    this.DLBDialog.appendChild(cancel)
    $('#' + item.id).click(function (e) {
      _self.ChartArray[0].signalDatas[Basic.OrignDatas.kline[_self.DataPreIndex + _self.cur_kn - 1]['datetime']] = 'buy'
      // Basic.OrignDatas.kline[_self.DataPreIndex + _self.cur_kn - 1]['signal'] = {
      //   price: Basic.OrignDatas.kline[_self.DataPreIndex + _self.cur_kn - 1].close,
      //   type: 'buy'
      // }

      _self.DivElement.removeChild(_self.DLBDialog)
      _self.DLBDialog = null
      _self.SetUpdate()
    })
    $('#' + item1.id).click(function (e) {
      _self.ChartArray[0].signalDatas[Basic.OrignDatas.kline[_self.DataPreIndex + _self.cur_kn - 1]['datetime']] = 'sell'
      // Basic.OrignDatas.kline[_self.DataPreIndex + _self.cur_kn - 1]['signal'] = {
      //   price: Basic.OrignDatas.kline[_self.DataPreIndex + _self.cur_kn - 1].close,
      //   type: 'sell'
      // }
      _self.DivElement.removeChild(_self.DLBDialog)
      _self.DLBDialog = null
      _self.SetUpdate()
    })
    $('#' + del.id).click(function (e) {
      delete _self.ChartArray[0].signalDatas.Basic.OrignDatas.kline[_self.DataPreIndex + _self.cur_kn - 1]['datetime']
      // Basic.OrignDatas.kline[_self.DataPreIndex + _self.cur_kn - 1]['signal'] = null
      _self.DivElement.removeChild(_self.DLBDialog)
      _self.DLBDialog = null
      _self.SetUpdate()
    })
    $('#' + cancel.id).click(function (e) {
      _self.DivElement.removeChild(_self.DLBDialog)
      _self.DLBDialog = null
      _self.SetUpdate()
    })

  }
  // 创建指标窗口
  this.CreateIndicatorsDialog = function (x) {
    var dialog = document.createElement('div')
    dialog.className = "indicators-dialog"
    dialog.id = Guid()
    dialog.style.position = 'absolute'
    dialog.style.top = parseInt(this.TopToolDiv.style.height.replace("px", ""))
    dialog.style.left = x + 'px'
    dialog.style.zIndex = 3
    dialog.style.fontSize = 18 + 'px'
    this.IndicatorsDialog = dialog
    this.DivElement.appendChild(this.IndicatorsDialog)
    for (var i = 0; i < IndicatorsList.length; i++) {
      var item = document.createElement('div')
      item.className = "indicators-dialog_item"
      item.id = Guid()
      item.innerText = IndicatorsList[i].name
      item.dataset.id = i
      this.IndicatorsDialog.appendChild(item)
      $("#" + item.id).click(function (e) {
        IndicatorsList[this.dataset.id].name != 'vol' ? IndicatorsList[this.dataset.id].datas = _self.CalculationIndicators(IndicatorsList[this.dataset.id].name) : IndicatorsList[this.dataset.id].datas = Basic.OrignDatas.kline
        // if (IndicatorsList[this.dataset.id].name == 'macd') {
        //   console.log('指标数据：', IndicatorsList[this.dataset.id].datas)
        //   saveJsonToFile(IndicatorsList[this.dataset.id].datas, 'macdDatas')
        // }
        _self.AddChart(IndicatorsList[this.dataset.id])
        _self.IndicatorsDialog.style.display = 'none'
      })
    }
    for (var j in IndicatorsList) {
      var id = IndicatorsList[j]['name']
    }
  }
  // 开始绘制
  this.Draw = function () {
    for (var i in this.ChartArray) {
      switch (this.ChartArray[i].name) {
        case 'kline':
          // this.TopLow = TopLow.Init()
          // this.ChartArray[i].topLowDatas = this.TopLow.Create(this.IndicatorDatas)
          var xAxisChart = new XAxis(this.Canvas, this.ChartArray[i])
          var kLineChart = new KLinesChart(this.Canvas, this.ChartArray[i])
          this.xAxisChart = xAxisChart
          this.kLineChart = kLineChart
          this.ChartObjArray.push(this.kLineChart)
          this.xAxisChart.Create()
          this.ChartArray[i].yRange = this.kLineChart.Create()
          break;
        case 'vol':
          var volChart = new VolChart(this.Canvas, this.ChartArray[i])
          this.volChart = volChart
          this.ChartObjArray.push(this.volChart)
          this.ChartArray[i].yRange = this.volChart.Create()
          break;
        case 'macd':
          var macdChart = new MACDChart(this.Canvas, this.ChartArray[i])
          this.macdChart = macdChart
          this.ChartObjArray.push(this.macdChart)
          this.ChartArray[i].yRange = this.macdChart.Create()
          break;
        case 'rsi':
          var rsiChart = new RSIChart(this.Canvas, this.ChartArray[i])
          this.rsiChart = rsiChart
          this.ChartObjArray.push(this.rsiChart)
          this.ChartArray[i].yRange = this.rsiChart.Create()
          break;
        case 'asi':
          var asiChart = new ASIChart(this.Canvas, this.ChartArray[i])
          this.asiChart = asiChart
          this.ChartObjArray.push(this.asiChart)
          this.ChartArray[i].yRange = this.asiChart.Create()
          break;
        case 'kdj':
          var kdjChart = new KDJChart(this.Canvas, this.ChartArray[i])
          this.kdjChart = kdjChart
          this.ChartObjArray.push(this.kdjChart)
          this.ChartArray[i].yRange = this.kdjChart.Create()
          break;
      }
    }
  }
  // 绘制十字 光标
  this.onDrawCursor = function (x, y) {
    // 当前光标所处的K线位置
    x *= Basic.pixelTatio
    y *= Basic.pixelTatio
    let kn = Math.ceil(
      (x - Basic.canvasPaddingLeft) /
      (Basic.kLineWidth + Basic.kLineMarginRight)
    )
    if (kn > this.ChartArray[0].datas.length) {
      kn = this.ChartArray[0].datas.length
    } else if (kn <= 0) {
      kn = 1
    }
    this.cur_kn = kn
    var cursorX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * kn - Basic.kLineMarginRight - Basic.kLineWidth / 2
    let chartConfig = null
    for (let i in this.ChartArray) {
      if (y > this.ChartArray[i].cStartY && y < this.ChartArray[i].cEndY) {
        chartConfig = this.ChartArray[i]
      }
    }
    if (!chartConfig) {
      return
    }
    let unitPxNum = (chartConfig.yRange.maxData - chartConfig.yRange.minData) / (chartConfig.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) // 每单位PX占多大值
    let yNum = ((chartConfig.cEndY - y - Basic.chartPd) * unitPxNum + chartConfig.yRange.minData).toFixed(2)
    if (chartConfig.yRange.isBig) {
      yNum = (yNum / 1000).toFixed(3) + 'k'
    }
    // 绘制虚线
    this.OptCanvas.clearRect(0, 0, Basic.width, Basic.height)
    this.OptCanvas.beginPath()
    this.OptCanvas.strokeStyle = '#666'
    this.OptCanvas.lineWidth = 1
    this.OptCanvas.setLineDash([5, 5])
    this.OptCanvas.moveTo(ToFixedPoint(cursorX), 0)
    this.OptCanvas.lineTo(ToFixedPoint(cursorX), ToFixedPoint(Basic.height - Basic.xAxisHeight))

    this.OptCanvas.moveTo(0, ToFixedPoint(y))
    this.OptCanvas.lineTo(ToFixedPoint(Basic.width - Basic.yAxisWidth), ToFixedPoint(y))
    this.OptCanvas.stroke()
    this.OptCanvas.closePath()

    // 绘制X轴的时间标识
    this.OptCanvas.font = '12px san-serif'
    Basic.curKIndex = kn - 1
    var curKMsg = this.ChartArray[0].datas[kn - 1]
    var tw = this.OptCanvas.measureText(curKMsg.datetime).width

    this.OptCanvas.fillStyle = '#333'
    this.OptCanvas.fillRect(x - tw / 2 - 10, Basic.height - Basic.xAxisHeight + 5, tw + 20, 15)

    this.OptCanvas.fillStyle = '#fff'
    this.OptCanvas.fillText(curKMsg.datetime, x - tw / 2, Basic.height - Basic.xAxisHeight + 17)

    var ytw = this.OptCanvas.measureText(yNum).width
    // 绘制Y轴的值标识
    this.OptCanvas.fillStyle = '#333'
    this.OptCanvas.fillRect(Basic.width - Basic.yAxisWidth, y - 10, ytw + 20, 20)

    this.OptCanvas.beginPath()
    this.OptCanvas.font = '12px san-serif'
    this.OptCanvas.fillStyle = '#fff'
    this.OptCanvas.fillText(yNum, Basic.width - Basic.yAxisWidth + 5, y + 5)
    this.OptCanvas.closePath()

    for (let a in this.ChartArray) {
      if (this.ChartArray[a].datas instanceof Array) {
        let o = {}
        o = this.ChartArray[a].datas[Basic.curKIndex]
        this.ChartArray[a].curMsg = o
      } else if (this.ChartArray[a].datas instanceof Object) {
        let o = {}
        for (let b in this.ChartArray[a].datas) {
          o[b] = (this.ChartArray[a].datas[b][Basic.curKIndex]).toFixed(2)
        }
        this.ChartArray[a].curMsg = o
      }
    }
    this.onDrawCurMsg()
  }
  // 绘制当前光标位置 具体信息
  this.onDrawCurMsg = function () {
    for (let c in this.ChartArray) {
      switch (this.ChartArray[c].name) {
        case 'kline':
          this.kLineChart.DrawCurMsg(this.OptCanvas, this.ChartArray[c])
          break;
        case 'vol':
          this.volChart.DrawCurMsg(this.OptCanvas, this.ChartArray[c])
          break;
        case 'macd':
          this.macdChart.DrawCurMsg(this.OptCanvas, this.ChartArray[c])
          break;
        case 'rsi':
          this.rsiChart.DrawCurMsg(this.OptCanvas, this.ChartArray[c])
          break;
        case 'asi':
          this.asiChart.DrawCurMsg(this.OptCanvas, this.ChartArray[c])
          break;
        case 'kdj':
          this.kdjChart.DrawCurMsg(this.OptCanvas, this.ChartArray[c])
          break;
      }
    }
  }
  // 图表缩放
  this.onKLineScale = function (type) {
    if (type >= 0) {
      Basic.kLineWidth += 2
      Basic.kLineMarginRight += 1
      Basic.kLineWidth > 40 && (Basic.kLineWidth = 40)
      Basic.kLineMarginRight > 30 && (Basic.kLineMarginRight = 30)
    } else {
      Basic.kLineWidth -= 2
      Basic.kLineMarginRight -= 1
      Basic.kLineWidth < 6 && (Basic.kLineWidth = 1)
      Basic.kLineMarginRight < 2 && (Basic.kLineMarginRight = 1)
    }
    this.CalSceenKNum()
    this.DataPreIndex = this.DataCurIndex + 1 - Math.floor(Basic.ScreenKNum)
    this.SetUpdate()
  }
}

/**
 * @desc 顶部工具栏组件
 */
function TopToolContainer () {
  this.TopTool
  this.Create = function (callback) {
    this.TopTool = document.createElement('div')
    this.TopTool.className = 'top-tool-container'
    this.TopTool.id = Guid()
    this.TopTool.style.height = '44px'
    this.TopTool.innerHTML =
      ' <input id="dateinput" value="2019-08-20T14:00:00Z" class="go-date-input" />\n' +
      ' <button id="go-date" class="go-date-btn">跳 转</button>\n' +
      ' <select id="period-select">\n' +
      ' <option value="1">1min</option>\n' +
      ' <option value="5">5min</option>\n' +
      ' <option value="15">15min</option>\n' +
      ' <option value="30">30min</option>\n' +
      ' </select>\n' +
      ' <div id="indicators-btn" class="indicators"><span class="iconfont icon-zhibiao"></span> 指 标</div>\n' +
      ' <div id="save-signal-btn" class="save-signal-btn"><span class="iconfont icon-baocun"></span> 保存买卖点 </div>\n' +
      ' <div id="pre-signal-btn" class="pre-signal-btn"><span class="iconfont icon-previous"></span> 上一个买卖点</div>\n' +
      ' <div id="next-signal-btn" class="next-signal-btn"><span class="iconfont icon-next"></span> 下一个买卖点</div>\n'
    return this.TopTool
  }
}

/**
 * @desc K线组件
 * @param {画布} canvas 
 * @param {配置} option 
 */
function KLinesChart (canvas, option) {
  this.Canvas = canvas
  this.Option = option
  this.Datas = option.datas
  this.TopLowDatas = option.topLowDatas
  this.XianDuanDatas = option.xianDuanDatas
  this.CentreDatas = option.centreDatas
  this.SignalDatas = option.signalDatas
  this.YNumpx = 0
  this.StartX = 0
  this.StartY = 0
  this.EndX = 0
  this.EndY = 0
  this.YAxisChart
  this.turnStatus = ""
  this.maxLow = {

  }
  this.maxTop = {

  }
  this.drawTopLowPoint = {

  }
  this.toplow = null
  this.signalDatetime = null
  // 创建K线图表
  this.Create = function () {
    this.YAxisChart = new YAxis(this.Canvas, this.Option)
    this.YAxisChart.Create('low', 'high')
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    var topLowList = []
    var topLowObj = null
    var lineObj = null
    var lineList = []
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawKLines(i, parseFloat(this.Datas[i].open), parseFloat(this.Datas[i].close), parseFloat(this.Datas[i].high), parseFloat(this.Datas[i].low))
      if (topLowObj && this.Datas[i].datetime == topLowObj['end_time']) {
        topLowList.push(i)
        topLowObj, topLowList = this.DrawBi(topLowObj, topLowList)
      }
      if (topLowList.length == 0 && this.TopLowDatas[this.Datas[i].datetime]) {
        topLowList.push(i)
        topLowObj = this.TopLowDatas[this.Datas[i].datetime]
      }
      if (lineObj && this.Datas[i].datetime == lineObj['end_time']) {
        lineList.push(i)
        lineObj, lineList = this.DrawDuan(lineObj, lineList)
      }
      if (lineList.length == 0 && this.XianDuanDatas[this.Datas[i].datetime]) {
        lineList.push(i)
        lineObj = this.XianDuanDatas[this.Datas[i].datetime]
      }
      // this.Datas[i].signal && this.Datas[i].signal.type != "" && this.DrawTradeSign(i, this.Datas[i])
      this.SignalDatas[this.Datas[i].datetime] && this.DrawTradeSign(i, this.SignalDatas[this.Datas[i].datetime], this.Datas[i]) && (this.signalDatetime = this.Datas[i].datetime)
      // this.TopLowDatas[this.Datas[i].datetime] && this.DrawBi(this.TopLowDatas[this.Datas[i].datetime], i, j)
      // this.XianDuanDatas[this.Datas[i].datetime] && this.DrawDuan(this.XianDuanDatas[this.Datas[i].datetime], i, j)
      // this.CentreDatas[this.Datas[i].datetime] && this.DrawCentre(this.CentreDatas[this.Datas[i].datetime], i, j)
    }
    for (var b in Basic.SignalDatas) {
      if (Basic.SignalDatas[b].datetime == this.signalDatetime) {
        Basic.SignalIndex = b
        break;
      }
    }
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }
  // 绘制当前信息
  this.DrawCurMsg = function (canvas, option) {
    let curMsg = option.curMsg
    let text = option.goodsName + ':' + curMsg.datetime + " " + '开=' + curMsg.open + ',' + '收=' + curMsg.close + ',' + '高=' + curMsg.high + ',' + '低=' + curMsg.low + ',' + '量=' + curMsg.volume
    canvas.setLineDash([0])
    canvas.strokeStyle = '#cdcdcd'
    canvas.fillStyle = '#f2faff'
    canvas.strokeRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.fillRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.beginPath()
    canvas.font = "18px Verdana"
    canvas.fillStyle = "#333"
    canvas.fillText(text, option.cStartX + 40, option.cStartY + 20)
    canvas.closePath()
    canvas.stroke()
  }
  // 绘制K线图
  this.DrawKLines = function (i, open, close, high, low) {
    var startX, startY, endX, endY, lowpx, highpx
    this.Canvas.beginPath()
    if (open < close) {
      // 上涨
      this.Canvas.fillStyle = Basic.upColor
      this.Canvas.strokeStyle = Basic.upColor
      startY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (close - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
      endY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (open - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
    } else if (open > close) {
      // 下跌
      this.Canvas.fillStyle = Basic.downColor
      this.Canvas.strokeStyle = Basic.downColor
      startY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (open - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
      endY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (close - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
    } else {
      // 平
      this.Canvas.fillStyle = '#666'
      this.Canvas.strokeStyle = '#666'
      startY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (open - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
      endY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (open - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
    }
    startX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * i + this.Option.cStartX
    endX = startX + Basic.kLineWidth
    highpx = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (high - this.YAxisChart.MinDatas) * this.YNumpx + this.Option.cStartY + Basic.curMsgContainerHeight
    lowpx = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (low - this.YAxisChart.MinDatas) * this.YNumpx + this.Option.cStartY + Basic.curMsgContainerHeight
    var h = endY - startY
    h < 1 && (h = 2)
    h == 0 && (h = 1)
    this.Canvas.fillRect(ToFixedRect(startX), ToFixedRect(startY), ToFixedRect(endX - startX), ToFixedRect(h))
    // config.basic.mainctx.setLineDash(0)
    this.Canvas.lineWidth = 1
    this.Canvas.moveTo(ToFixedPoint(startX + Basic.kLineWidth / 2), ToFixedPoint(highpx))
    this.Canvas.lineTo(ToFixedPoint(startX + Basic.kLineWidth / 2), ToFixedPoint(lowpx))
    this.Canvas.stroke()
    this.Canvas.closePath()

  }
  // 绘制K线信号
  this.DrawTradeSign = function (i, curSignMsg, curKDatas) {
    this.Canvas.beginPath()
    let centerX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * i + (Basic.kLineWidth / 2) + this.Option.cStartX
    let centerY = 0
    let r = Basic.signR
    let signType
    if (curSignMsg === 'buy') {
      signType = '买'
      centerY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (curKDatas.close - this.YAxisChart.MinDatas) * this.YNumpx + r + this.Option.cStartY + Basic.curMsgContainerHeight
      this.Canvas.fillStyle = Basic.buySignBg
    } else {
      signType = '卖'
      centerY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (curKDatas.close - this.YAxisChart.MinDatas) * this.YNumpx + r + this.Option.cStartY + Basic.curMsgContainerHeight
      this.Canvas.fillStyle = Basic.sellSignBg
    }
    this.Canvas.arc(centerX, centerY, r, 0, 2 * Math.PI)
    this.Canvas.fill()

    this.Canvas.beginPath()
    this.Canvas.font = '14px san-serif'
    this.Canvas.fillStyle = '#fff'
    this.Canvas.fillText(signType, (centerX - r / 2), centerY + r / 2.8)
    this.Canvas.stroke()
    this.Canvas.closePath()

    // this.Canvas.beginPath()
    // this.Canvas.font = '14px san-serif'
    // this.Canvas.fillStyle = '#333'
    // this.Canvas.fillText(curMsg.signal.price, centerX - r, curMsg.signal.type === 'buy' ? centerY + r + 15 : centerY - r - 5)
    // this.Canvas.stroke()
    // this.Canvas.closePath()
  }
  this.betweenDay = function (begin_time, end_time) {
    return parseInt((end_time - begin_time) / (1000 * 60 * 60 * 24))
  }
  this.DrawBi = function (obj, list) {
    var tstartX, tstartY, lstartX, lstartY
    if (obj.type == 'bottom') {
      tstartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * list[0] + this.Option.cStartX + Basic.kLineWidth / 2
      tstartY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (obj.high - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
      lstartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * list[1] + this.Option.cStartX + Basic.kLineWidth / 2
      lstartY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (obj.low - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
    } else {
      tstartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * list[0] + this.Option.cStartX + Basic.kLineWidth / 2
      tstartY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (obj.low - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
      lstartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * list[1] + this.Option.cStartX + Basic.kLineWidth / 2
      lstartY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (obj.high - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
    }
    this.Canvas.beginPath()
    this.Canvas.strokeStyle = '#f72b27'
    this.Canvas.lineWidth = 1
    this.Canvas.moveTo(ToFixedPoint(tstartX), ToFixedPoint(tstartY))
    this.Canvas.lineTo(ToFixedPoint(lstartX), ToFixedPoint(lstartY))
    this.Canvas.stroke()
    this.Canvas.closePath()
    return null, []
  }
  this.DrawDuan = function (obj, list) {
    var tstartX, tstartY, lstartX, lstartY
    if (obj.type == 'down') {
      tstartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * list[0] + this.Option.cStartX + Basic.kLineWidth / 2
      tstartY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (obj.high - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
      lstartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * list[1] + this.Option.cStartX + Basic.kLineWidth / 2
      lstartY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (obj.low - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
    } else {
      tstartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * list[0] + this.Option.cStartX + Basic.kLineWidth / 2
      tstartY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (obj.low - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
      lstartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * list[1] + this.Option.cStartX + Basic.kLineWidth / 2
      lstartY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (obj.high - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
    }
    this.Canvas.beginPath()
    this.Canvas.strokeStyle = '#ffc400'
    this.Canvas.lineWidth = 2
    this.Canvas.moveTo(ToFixedPoint(tstartX), ToFixedPoint(tstartY))
    this.Canvas.lineTo(ToFixedPoint(lstartX), ToFixedPoint(lstartY))
    this.Canvas.stroke()
    this.Canvas.closePath()
    return null, []
  }
  this.DrawCentre = function (obj, index, length) {
    t = (new Date(obj.end_time).getTime() - new Date(obj.begin_time).getTime()) / 1000 / Basic.period / 60
    index2 = index + t
    if (index2 > length) {
      return
    }
    startX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * index + this.Option.cStartX + Basic.kLineWidth / 2
    startY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (obj.high - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
    endX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * index2 + this.Option.cStartX + Basic.kLineWidth / 2
    endY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (obj.low - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
    this.Canvas.beginPath()
    this.Canvas.strokeStyle = '#0093ff'
    this.Canvas.lineWidth = 2
    this.Canvas.strokeRect(startX, startY, endX - startX, endY - startY)
    this.Canvas.closePath()
  }
  this.DrawTopLowLine = function () {
    if (!this.drawTopLowPoint['top'] || !this.drawTopLowPoint['low']) {
      return
    }
    tstartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * this.drawTopLowPoint['top'].index + this.Option.cStartX + Basic.kLineWidth / 2
    tstartY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (this.drawTopLowPoint['top'].value - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
    lstartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * this.drawTopLowPoint['low'].index + this.Option.cStartX + Basic.kLineWidth / 2
    lstartY = this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd - (this.drawTopLowPoint['low'].value - this.YAxisChart.MinDatas) * this.YNumpx + Basic.curMsgContainerHeight + this.Option.cStartY
    this.Canvas.beginPath()
    this.Canvas.strokeStyle = '#f72b27'
    this.Canvas.lineWidth = 2
    this.Canvas.moveTo(ToFixedPoint(tstartX), ToFixedPoint(tstartY))
    this.Canvas.lineTo(ToFixedPoint(lstartX), ToFixedPoint(lstartY))
    this.Canvas.stroke()
    this.Canvas.closePath()
  }
  // 更新K线图表
  this.SetUpdateKLineChart = function (option) {
    this.Option = option
    this.Datas = option.datas
    this.TopLowDatas = option.topLowDatas
    this.YAxisChart.SetUpdateYAxis(this.Option)
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    this.turnStatus = ""
    this.maxLow = {}
    this.maxTop = {}
    this.drawTopLowPoint = {}
    topLowObj = null
    topLowList = []
    lineObj = null
    lineList = []
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawKLines(i, parseFloat(this.Datas[i].open), parseFloat(this.Datas[i].close), parseFloat(this.Datas[i].high), parseFloat(this.Datas[i].low))
      // 绘制笔
      if (topLowObj && this.Datas[i].datetime == topLowObj['end_time']) {
        topLowList.push(i)
        topLowObj, topLowList = this.DrawBi(topLowObj, topLowList)
      }
      if (topLowList.length == 0 && this.TopLowDatas[this.Datas[i].datetime]) {
        topLowList.push(i)
        topLowObj = this.TopLowDatas[this.Datas[i].datetime]
      }
      // 绘制线段
      if (lineObj && this.Datas[i].datetime == lineObj['end_time']) {
        lineList.push(i)
        lineObj, lineList = this.DrawDuan(lineObj, lineList)
      }
      if (lineList.length == 0 && this.XianDuanDatas[this.Datas[i].datetime]) {
        lineList.push(i)
        lineObj = this.XianDuanDatas[this.Datas[i].datetime]
      }
      // this.Datas[i].signal && this.Datas[i].signal.type != "" && this.DrawTradeSign(i, this.Datas[i])
      this.SignalDatas[this.Datas[i].datetime] && this.DrawTradeSign(i, this.SignalDatas[this.Datas[i].datetime], this.Datas[i]) && (this.signalDatetime = this.Datas[i].datetime)
      this.CentreDatas[this.Datas[i].datetime] && this.DrawCentre(this.CentreDatas[this.Datas[i].datetime], i, j)
    }
    for (var b in Basic.SignalDatas) {
      if (Basic.SignalDatas[b].datetime == this.signalDatetime) {
        Basic.SignalIndex = b
        break;
      }
    }
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }
}

/**
 * vol 量图组件
 * @param {画布} canvas 
 * @param {配置} option 
 */
function VolChart (canvas, option) {
  this.Canvas = canvas
  this.Option = option
  this.Datas = option.datas
  this.YNumpx = 0
  this.StartX = 0
  this.StartY = 0
  this.EndX = 0
  this.EndY = 0
  this.Create = function () {
    this.YAxisChart = new YAxis(this.Canvas, this.Option)
    this.YAxisChart.Create('volume')
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawVols(i, this.YNumpx, parseFloat(this.Datas[i].volume), parseFloat(this.Datas[i].open), parseFloat(this.Datas[i].close), this.StartX, this.StartY, this.EndX, this.EndY)
    }
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }

  this.DrawVols = function (i, yNumpx, vol, open, close, startX, startY, endX, endY) {
    if (this.YAxisChart.isBigNum) {
      vol = vol / 1000
    }
    this.Canvas.beginPath()
    if (open < close) {
      this.Canvas.fillStyle = Basic.volUpColor
    } else if (open > close) {
      this.Canvas.fillStyle = Basic.volDownColor
    }
    startX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * i + this.Option.cStartX - Basic.kLineMarginRight / 2 + 1
    endX = startX + Basic.kLineWidth + Basic.kLineMarginRight - 1
    startY = this.Option.cHeight - ((vol - this.YAxisChart.MinDatas) * yNumpx) - Basic.chartPd + this.Option.cStartY
    endY = this.Option.cEndY - Basic.chartPd
    this.Canvas.fillRect(ToFixedRect(startX), ToFixedRect(startY), ToFixedRect(endX - startX), ToFixedRect(endY - startY))
    this.Canvas.stroke()
    this.Canvas.closePath()
  }

  // 绘制当前信息
  this.DrawCurMsg = function (canvas, option) {
    let curMsg = option.curMsg
    let text = 'Volume  ' + curMsg.volume
    canvas.setLineDash([0])
    canvas.strokeStyle = '#cdcdcd'
    canvas.fillStyle = '#f2faff'
    canvas.strokeRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.fillRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.beginPath()
    canvas.font = "18px Verdana"
    canvas.fillStyle = "#333"
    canvas.fillText(text, option.cStartX + 40, option.cStartY + 20)
    canvas.closePath()
    // canvas.stroke()
  }

  this.SetUpdateVol = function (option) {
    this.Option = option
    this.Datas = option.datas
    this.YAxisChart.SetUpdateYAxis(this.Option)
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawVols(i, this.YNumpx, parseFloat(this.Datas[i].volume), parseFloat(this.Datas[i].open), parseFloat(this.Datas[i].close), this.StartX, this.StartY, this.EndX, this.EndY)
    }
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }
}

/**
 * MACD 组件
 * @param {画布} cavnas 
 * @param {配置} option 
 */
function MACDChart (canvas, option) {
  this.Canvas = canvas
  this.Option = option
  this.Datas = option.datas
  this.StartX = 0
  this.StartY = 0
  this.EndX = 0
  this.EndY = 0

  this.Create = function () {
    this.YAxisChart = new YAxis(this.Canvas, this.Option)
    this.YAxisChart.Create('DIFF', 'MACD', 'DEA')
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    let zeroY = null
    if (this.YAxisChart.MinDatas < 0) {
      zeroY = this.Option.cEndY - Math.abs(this.YAxisChart.MinDatas * this.YNumpx) - Basic.chartPd
    }
    this.Option.zeroY = zeroY
    this.DrawMACD()
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }

  this.SetUpdateMACDChart = function (option) {
    this.Option = option
    this.Datas = option.datas
    this.YAxisChart.SetUpdateYAxis(this.Option)
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    let zeroY = null
    if (this.YAxisChart.MinDatas < 0) {
      zeroY = this.Option.cEndY - Math.abs(this.YAxisChart.MinDatas * this.YNumpx) - Basic.chartPd
    }
    this.Option.zeroY = zeroY
    this.DrawMACD()
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }

  // 绘制当前信息
  this.DrawCurMsg = function (canvas, option) {
    let curMsg = option.curMsg
    let text = 'MACD  ' + 'DIF:' + curMsg['DIFF'].toFixed(4) + ',DEA:' + curMsg['DEA'].toFixed(4) + ',MACD:' + curMsg['MACD'].toFixed(4)
    canvas.setLineDash([0])
    canvas.strokeStyle = '#cdcdcd'
    canvas.fillStyle = '#f2faff'
    canvas.strokeRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.fillRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.beginPath()
    canvas.font = "18px Verdana"
    canvas.fillStyle = "#333"
    canvas.fillText(text, option.cStartX + 40, option.cStartY + 20)
    canvas.closePath()
    // canvas.stroke()
  }

  this.DrawMACD = function () {
    // 绘制zero线
    this.Canvas.beginPath()
    this.Canvas.strokeStyle = '#333'
    this.Canvas.lineWidth = 1
    this.Canvas.moveTo(0, this.Option.zeroY)
    this.Canvas.lineTo(this.Option.cEndX - Basic.yAxisWidth, this.Option.zeroY)
    this.Canvas.stroke()
    this.Canvas.closePath()
    // 绘制DIFF 
    this.Canvas.beginPath()
    this.Canvas.strokeStyle = this.Option.style['DIFF']
    this.Canvas.lineWidth = 1
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawCurve(i, 'DIFF')
    }
    this.Canvas.stroke()
    this.Canvas.closePath()
    // 绘制DEA
    this.Canvas.beginPath()
    this.Canvas.strokeStyle = this.Option.style['DEA']
    this.Canvas.lineWidth = 1
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawCurve(i, 'DEA')
    }
    this.Canvas.stroke()
    this.Canvas.closePath()
    // 绘制MACD
    this.Canvas.beginPath()
    this.Canvas.lineWidth = 2
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      // this.DrawVerticalLine(i, 'MACD', 'up')
      if (this.Datas[i]['MACD'] > 0) {
        this.DrawVerticalUpLine(i, 'MACD')
      }
    }
    this.Canvas.stroke()
    this.Canvas.closePath()

    this.Canvas.beginPath()
    this.Canvas.lineWidth = 2
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      // this.DrawVerticalLine(i, 'MACD', 'down')
      if (this.Datas[i]['MACD'] < 0) {
        this.DrawVerticalDownLine(i, 'MACD')
      }
    }
    this.Canvas.stroke()
    this.Canvas.closePath()
  }

  this.DrawCurve = function (i, attrName) {

    this.StartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * i + Basic.kLineWidth / 2 + this.Option.cStartX
    if (parseFloat(this.Datas[i][attrName]) >= 0) {
      this.Option.zeroY != null ? this.StartY = this.Option.zeroY - (parseFloat(this.Datas[i][attrName]) * this.YNumpx) : this.StartY = this.Option.cEndY - (parseFloat(this.Datas[i][attrName]) * yNumpx) - Basic.chartPd
    } else {
      this.StartY = this.Option.zeroY + (Math.abs(parseFloat(this.Datas[i][attrName]) * this.YNumpx))
    }
    if (i === 0) {
      this.Canvas.moveTo(this.StartX, this.StartY)
    }
    this.Canvas.lineTo(this.StartX, this.StartY)
  }

  this.DrawVerticalDownLine = function (i, attrName) {
    this.StartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * i + Basic.kLineWidth / 2 + this.Option.cStartX
    this.Canvas.strokeStyle = this.Option.style['MACD']['down']
    this.StartY = this.Option.zeroY + (Math.abs(parseFloat(this.Datas[i][attrName]) * this.YNumpx))
    this.Canvas.moveTo(this.StartX, this.StartY)
    this.Canvas.lineTo(this.StartX, this.Option.zeroY)
    // if(this.Datas[i][attrName] > 0){
    //   this.Canvas.strokeStyle = this.Option.style['MACD']['down']
    //   this.StartY = this.Option.zeroY + (Math.abs(parseFloat(this.Datas[i][attrName]) * this.YNumpx))
    //   this.Canvas.moveTo(this.StartX, this.StartY)
    //   this.Canvas.lineTo(this.StartX, this.Option.zeroY)
    // }else if(this.Datas[i][attrName] < 0){
    //   this.Canvas.strokeStyle = this.Option.style['MACD']['up']
    //   this.Option.zeroY != null ? this.StartY = this.Option.zeroY - (parseFloat(this.Datas[i][attrName]) * this.YNumpx) : this.StartY = this.Option.cEndY - (parseFloat(this.Datas[i][attrName]) * yNumpx) - Basic.chartPd
    //   this.Canvas.moveTo(this.StartX, this.StartY)
    //   this.Canvas.lineTo(this.StartX, this.Option.zeroY)
    // }

    // if (type == 'up') {
    //   if (parseFloat(this.Datas[i][attrName]) > 0) {
    //     this.Canvas.strokeStyle = this.Option.style['MACD']['up']
    //     this.Option.zeroY != null ? this.StartY = this.Option.zeroY - (parseFloat(this.Datas[i][attrName]) * this.YNumpx) : this.StartY = this.Option.cEndY - (parseFloat(this.Datas[i][attrName]) * yNumpx) - Basic.chartPd
    //     this.Canvas.moveTo(this.StartX, this.StartY)
    //     this.Canvas.lineTo(this.StartX, this.Option.zeroY)
    //   }
    // } else {
    //   if (parseFloat(this.Datas[i][attrName]) < 0) {
    //     this.Canvas.strokeStyle = this.Option.style['MACD']['down']
    //     this.StartY = this.Option.zeroY + (Math.abs(parseFloat(this.Datas[i][attrName]) * this.YNumpx))
    //     this.Canvas.moveTo(this.StartX, this.StartY)
    //     this.Canvas.lineTo(this.StartX, this.Option.zeroY)
    //   }
    // }

  }
  this.DrawVerticalUpLine = function (i, attrName) {
    this.StartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * i + Basic.kLineWidth / 2 + this.Option.cStartX
    this.Canvas.strokeStyle = this.Option.style['MACD']['up']
    this.Option.zeroY != null ? this.StartY = this.Option.zeroY - (parseFloat(this.Datas[i][attrName]) * this.YNumpx) : this.StartY = this.Option.cEndY - (parseFloat(this.Datas[i][attrName]) * yNumpx) - Basic.chartPd
    this.Canvas.moveTo(this.StartX, this.StartY)
    this.Canvas.lineTo(this.StartX, this.Option.zeroY)
    // if(this.Datas[i][attrName] > 0){
    //   this.Canvas.strokeStyle = this.Option.style['MACD']['down']
    //   this.StartY = this.Option.zeroY + (Math.abs(parseFloat(this.Datas[i][attrName]) * this.YNumpx))
    //   this.Canvas.moveTo(this.StartX, this.StartY)
    //   this.Canvas.lineTo(this.StartX, this.Option.zeroY)
    // }else if(this.Datas[i][attrName] < 0){
    //   this.Canvas.strokeStyle = this.Option.style['MACD']['up']
    //   this.Option.zeroY != null ? this.StartY = this.Option.zeroY - (parseFloat(this.Datas[i][attrName]) * this.YNumpx) : this.StartY = this.Option.cEndY - (parseFloat(this.Datas[i][attrName]) * yNumpx) - Basic.chartPd
    //   this.Canvas.moveTo(this.StartX, this.StartY)
    //   this.Canvas.lineTo(this.StartX, this.Option.zeroY)
    // }
  }
}

function ASIChart (canvas, option) {
  this.Canvas = canvas
  this.Option = option
  this.Datas = option.datas
  this.StartX = 0
  this.StartY = 0
  this.EndX = 0
  this.EndY = 0
  this.Create = function () {
    this.YAxisChart = new YAxis(this.Canvas, this.Option)
    this.YAxisChart.Create('ASI', 'ASIT')
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    this.DrawASI()
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }

  this.SetUpdateASIChart = function (option) {
    this.Option = option
    this.Datas = option.datas
    this.YAxisChart.SetUpdateYAxis(this.Option)
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    this.DrawASI()
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }

  this.DrawASI = function () {
    this.Canvas.beginPath()
    this.Canvas.strokeStyle = this.Option.style['ASI']
    this.Canvas.lineWidth = 1
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawCurve(i, 'ASI')
    }
    this.Canvas.stroke()
    this.Canvas.closePath()

    this.Canvas.beginPath()
    this.Canvas.strokeStyle = this.Option.style['ASIT']
    this.Canvas.lineWidth = 1
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawCurve(i, 'ASIT')
    }
    this.Canvas.stroke()
    this.Canvas.closePath()
  }

  this.DrawCurve = function (i, attrName) {
    this.StartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * i + Basic.kLineWidth / 2 + this.Option.cStartX
    this.StartY = this.Option.cEndY - (this.Datas[i][attrName] - this.YAxisChart.MinDatas) * this.YNumpx - Basic.chartPd
    if (i === 0) {
      this.Canvas.moveTo(this.StartX, this.StartY)
    }
    this.Canvas.lineTo(this.StartX, this.StartY)
  }

  // 绘制当前信息
  this.DrawCurMsg = function (canvas, option) {
    let curMsg = option.curMsg
    let text = 'ASI  ' + 'ASI= ' + curMsg['ASI'].toFixed(4) + ',ASIT= ' + curMsg['ASIT'].toFixed(4)
    canvas.strokeStyle = '#cdcdcd'
    canvas.fillStyle = '#f2faff'
    canvas.strokeRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.fillRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.beginPath()
    canvas.font = "18px Verdana"
    canvas.fillStyle = "#333"
    canvas.fillText(text, option.cStartX + 40, option.cStartY + 20)
    canvas.closePath()
    // canvas.stroke()
  }
}

function KDJChart (canvas, option) {
  this.Canvas = canvas
  this.Option = option
  this.Datas = option.datas
  this.StartX = 0
  this.StartY = 0
  this.EndX = 0
  this.EndY = 0
  this.Create = function () {
    this.YAxisChart = new YAxis(this.Canvas, this.Option)
    this.YAxisChart.Create('K', 'D', 'J')
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    this.DrawKDJ()
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }

  this.SetUpdateASIChart = function (option) {
    this.Option = option
    this.Datas = option.datas
    this.YAxisChart.SetUpdateYAxis(this.Option)
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    this.DrawKDJ()
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }

  this.DrawKDJ = function () {
    this.Canvas.beginPath()
    this.Canvas.strokeStyle = this.Option.style['K']
    this.Canvas.lineWidth = 1
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawCurve(i, 'K')
    }
    this.Canvas.stroke()
    this.Canvas.closePath()

    this.Canvas.beginPath()
    this.Canvas.strokeStyle = this.Option.style['D']
    this.Canvas.lineWidth = 1
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawCurve(i, 'D')
    }
    this.Canvas.stroke()
    this.Canvas.closePath()

    this.Canvas.beginPath()
    this.Canvas.strokeStyle = this.Option.style['J']
    this.Canvas.lineWidth = 1
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawCurve(i, 'J')
    }
    this.Canvas.stroke()
    this.Canvas.closePath()
  }

  this.DrawCurve = function (i, attrName) {
    this.StartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * i + Basic.kLineWidth / 2 + this.Option.cStartX
    this.StartY = this.Option.cEndY - (this.Datas[i][attrName] - this.YAxisChart.MinDatas) * this.YNumpx - Basic.chartPd
    if (i === 0) {
      this.Canvas.moveTo(this.StartX, this.StartY)
    }
    this.Canvas.lineTo(this.StartX, this.StartY)
  }

  // 绘制当前信息
  this.DrawCurMsg = function (canvas, option) {
    let curMsg = option.curMsg
    let text = 'KDJ  ' + 'K= ' + curMsg['K'].toFixed(4) + ',D= ' + curMsg['D'].toFixed(4) + ',J= ' + curMsg['J'].toFixed(4)
    canvas.strokeStyle = '#cdcdcd'
    canvas.fillStyle = '#f2faff'
    canvas.strokeRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.fillRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.beginPath()
    canvas.font = "18px Verdana"
    canvas.fillStyle = "#333"
    canvas.fillText(text, option.cStartX + 40, option.cStartY + 20)
    canvas.closePath()
    // canvas.stroke()
  }
}

function RSIChart (canvas, option) {
  this.Canvas = canvas
  this.Option = option
  this.Datas = option.datas
  this.StartX = 0
  this.StartY = 0
  this.EndX = 0
  this.EndY = 0
  this.Create = function () {
    this.YAxisChart = new YAxis(this.Canvas, this.Option)
    this.YAxisChart.Create('A', 'D', 'RSI6', 'RSI12', 'RSI24')
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    this.DrawRSI()
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }

  this.SetUpdateRSIChart = function (option) {
    this.Option = option
    this.Datas = option.datas
    this.YAxisChart.SetUpdateYAxis(this.Option)
    this.YNumpx = (this.Option.cHeight - Basic.curMsgContainerHeight - Basic.chartPd) / (this.YAxisChart.MaxDatas - this.YAxisChart.MinDatas)
    this.DrawRSI()
    let range = {
      minData: this.YAxisChart.MinDatas,
      maxData: this.YAxisChart.MaxDatas
    }
    return range
  }

  this.DrawRSI = function () {
    this.Canvas.beginPath()
    this.Canvas.fillStyle = 'rgba(51,51,51,0.2)'
    this.Canvas.fillRect(0, this.Option.cEndY - Basic.chartPd - (80 - this.YAxisChart.MinDatas) * this.YNumpx, Basic.width - Basic.yAxisWidth, 60 * this.YNumpx)
    this.Canvas.stroke()
    this.Canvas.closePath()

    this.Canvas.beginPath()
    this.Canvas.fillStyle = 'rgba(51,51,51,0.4)'
    this.Canvas.fillRect(0, this.Option.cEndY - Basic.chartPd - (60 - this.YAxisChart.MinDatas) * this.YNumpx, Basic.width - Basic.yAxisWidth, 20 * this.YNumpx)
    this.Canvas.stroke()
    this.Canvas.closePath()

    this.Canvas.beginPath()
    this.Canvas.strokeStyle = this.Option.style['RSI6']
    this.Canvas.lineWidth = 1
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawCurve(i, 'RSI6')
    }
    this.Canvas.stroke()
    this.Canvas.closePath()

    this.Canvas.beginPath()
    this.Canvas.strokeStyle = this.Option.style['RSI12']
    this.Canvas.lineWidth = 1
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawCurve(i, 'RSI12')
    }
    this.Canvas.stroke()
    this.Canvas.closePath()

    this.Canvas.beginPath()
    this.Canvas.strokeStyle = this.Option.style['RSI24']
    this.Canvas.lineWidth = 1
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      this.DrawCurve(i, 'RSI24')
    }
    this.Canvas.stroke()
    this.Canvas.closePath()
  }

  this.DrawCurve = function (i, attrName) {
    this.StartX = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * i + Basic.kLineWidth / 2 + this.Option.cStartX
    this.StartY = this.Option.cEndY - (this.Datas[i][attrName] - this.YAxisChart.MinDatas) * this.YNumpx - Basic.chartPd
    if (i === 0) {
      this.Canvas.moveTo(this.StartX, this.StartY)
    }
    this.Canvas.lineTo(this.StartX, this.StartY)
  }

  // 绘制当前信息
  this.DrawCurMsg = function (canvas, option) {
    let curMsg = option.curMsg
    let text = 'RSI(6,12,24)  ' + 'RSI6= ' + curMsg['RSI6'].toFixed(4) + ',RSI12= ' + curMsg['RSI12'].toFixed(4) + ',RSI24= ' + curMsg['RSI24'].toFixed(4)
    canvas.setLineDash([0])
    canvas.strokeStyle = '#cdcdcd'
    canvas.fillStyle = '#f2faff'
    canvas.strokeRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.fillRect(option.cStartX, option.cStartY, option.cEndX - option.cStartX, Basic.curMsgContainerHeight / 2)
    canvas.beginPath()
    canvas.font = "18px Verdana"
    canvas.fillStyle = "#333"
    canvas.fillText(text, option.cStartX + 40, option.cStartY + 20)
    canvas.closePath()
    // canvas.stroke()
  }
}
// Y轴画法
function YAxis (canvas, option) {
  this.Canvas = canvas
  this.StartX = option.cEndX - Basic.yAxisWidth
  this.StartY = option.cStartY + Basic.curMsgContainerHeight
  this.EndX = option.cEndX
  this.EndY = option.cEndY - Basic.chartPd
  this.Datas = option.datas
  this.YPoints = []
  this.YTexts = []
  this.MinDatas
  this.MaxDatas
  this.isBigNum // 判断值是否大于5位数，大于5位数 值 在展示的时候末尾要加上 k

  this.Create = function (...attrs) {
    this.attrs = attrs
    this.SetValueRange()
    this.Draw()
  }

  this.SetValueRange = function () {
    this.YPoints = []
    // 处理两种数据类型
    let datas = this.Datas
    let attrs = this.attrs
    let minArray = []
    let maxArray = []
    let minData, maxData
    if (datas instanceof Array) {
      for (let i in attrs) {
        minData = Math.min.apply(
          Math,
          datas.map(function (o) {
            return (parseFloat(o[attrs[i]]))
          })
        )
        maxData = Math.max.apply(
          Math,
          datas.map(function (o) {
            return (parseFloat(o[attrs[i]]))
          })
        )
        minArray.push(minData)
        maxArray.push(maxData)
      }
      this.MinDatas = Math.min.apply(
        Math, minArray.map(function (o) {
          return o
        })
      )
      this.MaxDatas = Math.max.apply(
        Math, maxArray.map(function (o) {
          return o
        })
      )
    } else {
      var dataArray = []
      for (var i in datas) {
        for (var j in datas[i]) {
          dataArray.push(datas[i][j])
        }
      }
      this.MinDatas = Math.min.apply(
        Math, dataArray.map(function (o) {
          return o
        })
      )
      this.MaxDatas = Math.max.apply(
        Math, dataArray.map(function (o) {
          return o
        })
      )
    }

    var fixArray = [1, 0.1, 0.01, 0.001, 0.0001, 0.00001, 0.000001]
    // 判断值是否大于等于6位数，是的话 以 k 为单位
    if (((Math.ceil(this.MaxDatas)).toString().length) >= 6) {
      this.isBigNum = true
      this.MinDatas = this.MinDatas / 1000
      this.MaxDatas = this.MaxDatas / 1000
    }
    // 计算最大值和最小值，分别向上取整和向下取整
    var minDataLength = (Math.floor(this.MinDatas)).toString().length
    var maxDataLength = (Math.ceil(this.MaxDatas)).toString().length
    if (minDataLength >= 3) {
      this.MinDatas = Math.floor(this.MinDatas * fixArray[minDataLength - 3]) / fixArray[minDataLength - 3]
    }
    if (maxDataLength >= 3) {
      this.MaxDatas = Math.ceil(this.MaxDatas * fixArray[maxDataLength - 3]) / fixArray[maxDataLength - 3]
    }

    var limit = (this.MaxDatas - this.MinDatas) / 4
    if (minDataLength > 2) {
      limit = Math.ceil(limit)
    }
    var unitPx = (this.EndY - this.StartY) / (this.MaxDatas - this.MinDatas)

    // 添加 YPoints ， 里面包含y值和 y轴上的位置
    for (var a = 0; a <= 4; a++) {
      var value = this.MaxDatas - a * limit > this.MinDatas ? this.MaxDatas - a * limit : this.MinDatas
      var yPosition = this.StartY + (this.MaxDatas - value) * unitPx
      var item = {
        value: value,
        yPosition: yPosition
      }
      this.YPoints.push(item)
    }
  }

  this.Draw = function () {
    // 绘制Y轴
    this.Canvas.beginPath()
    this.Canvas.strokeStyle = '#333333'
    this.Canvas.lineWidth = 1
    this.Canvas.moveTo(ToFixedPoint(this.StartX), ToFixedPoint(this.StartY))
    this.Canvas.lineTo(ToFixedPoint(this.StartX), ToFixedPoint(this.EndY))
    this.Canvas.font = '12px sans-serif'
    this.Canvas.fillStyle = '#333'
    for (var i in this.YPoints) {
      this.Canvas.moveTo(ToFixedPoint(this.StartX), ToFixedPoint(this.YPoints[i].yPosition))
      this.Canvas.lineTo(ToFixedPoint(this.StartX + 5), ToFixedPoint(this.YPoints[i].yPosition))
      this.Canvas.fillText((this.YPoints[i].value).toFixed(2), this.StartX + 10, this.YPoints[i].yPosition + 5)
    }
    this.Canvas.closePath()
    this.Canvas.stroke()

    this.Canvas.beginPath()
    this.Canvas.strokeStyle = '#d5e2e6'
    this.Canvas.lineWidth = 1
    for (var j in this.YPoints) {
      this.Canvas.moveTo(0, ToFixedPoint(this.YPoints[j].yPosition))
      this.Canvas.lineTo(this.StartX, ToFixedPoint(this.YPoints[j].yPosition))
    }
    this.Canvas.closePath()
    this.Canvas.stroke()
  }

  this.SetUpdateYAxis = function (option) {
    this.StartX = option.cEndX - Basic.yAxisWidth
    this.StartY = option.cStartY + Basic.curMsgContainerHeight
    this.EndX = option.cEndX
    this.EndY = option.cEndY - Basic.chartPd
    this.Datas = option.datas
    // this.Canvas.clearRect(this.StartX, this.StartY, Basic.yAxisWidth, this.EndY - this.StartY)
    this.SetValueRange()
    this.Draw()
  }
}
// X轴画法
function XAxis (canvas, option) {
  this.Canvas = canvas
  this.StartX = 0
  this.StartY = Basic.height - Basic.xAxisHeight
  this.EndX = option.cEndX - Basic.yAxisWidth
  this.EndY = Basic.height
  this.Datas = option.datas
  this.XPoints = []

  this.Create = function () {
    this.SetValueRange()
    this.Draw()
  }

  this.SetValueRange = function () {
    this.XPoints = []
    var spaceTime = parseInt((this.EndX - Basic.canvasPaddingLeft) / (Basic.kLineWidth + Basic.kLineMarginRight) / 4)
    for (let i = 1, j = parseInt(this.Datas.length / spaceTime); i <= j; i++) {
      var item = {}
      item.value = this.Datas[i * spaceTime - 1].datetime
      item.xPosition = Basic.canvasPaddingLeft + (Basic.kLineWidth + Basic.kLineMarginRight) * i * spaceTime - Basic.kLineMarginRight - Basic.kLineWidth / 2
      this.XPoints.push(item)
    }
  }

  this.Draw = function () {
    // 绘制X轴
    this.Canvas.beginPath()
    this.Canvas.strokeStyle = '#000'
    this.Canvas.lineWidth = 1
    this.Canvas.moveTo(ToFixedPoint(this.StartX), ToFixedPoint(this.StartY))
    this.Canvas.lineTo(ToFixedPoint(this.EndX), ToFixedPoint(this.StartY))
    this.Canvas.font = '12px sans-serif'
    this.Canvas.fillStyle = '#333'
    for (var i = 0, j = this.XPoints.length; i < j; i++) {
      this.Canvas.moveTo(ToFixedPoint(this.XPoints[i].xPosition), ToFixedPoint(this.StartY))
      this.Canvas.lineTo(ToFixedPoint(this.XPoints[i].xPosition), ToFixedPoint(this.StartY + 5))
      this.Canvas.fillText(this.XPoints[i].value, this.XPoints[i].xPosition - this.Canvas.measureText(this.XPoints[i].value).width / 2, this.StartY + 20)
    }
    this.Canvas.stroke()
    this.Canvas.closePath()

    this.Canvas.beginPath()
    this.Canvas.strokeStyle = '#d5e2e6'
    this.Canvas.lineWidth = 1
    for (var j in this.XPoints) {
      this.Canvas.moveTo(ToFixedPoint(this.XPoints[j].xPosition), 0)
      this.Canvas.lineTo(ToFixedPoint(this.XPoints[j].xPosition), this.StartY)
    }
    this.Canvas.closePath()
    this.Canvas.stroke()
  }

  this.SetUpdateXAxis = function (option) {
    this.StartX = 0
    this.StartY = Basic.height - Basic.xAxisHeight
    this.EndX = option.cEndX - Basic.yAxisWidth
    this.EndY = Basic.height
    // this.Canvas.clearRect(this.StartX, this.StartY, this.EndX - this.StartX, this.EndY - this.StartY)
    this.Datas = option.datas
    this.SetValueRange()
    this.Draw()
  }
}

QTChart.Init = function (divElement) {
  var qtchart = new QTChart(divElement)
  return qtchart
}

function GetDevicePixelRatio () {
  if (typeof (window) == 'undefined') return 1;
  return window.devicePixelRatio || 1;
}

function Guid () {
  function S4 () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  }
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

//修正线段有毛刺
function ToFixedPoint (value) {
  return parseInt(value) + 0.5;
}

function ToFixedRect (value) {
  var rounded;
  return rounded = (0.5 + value) << 0;
}

function saveJsonToFile (oData, fileName) {
  // var data = Basic.OrignDatas.kline
  var data = oData
  var content = JSON.stringify(data)
  var blob = new Blob([content], {
    type: "text/plain;charset=utf-8"
  });
  saveAs(blob, fileName + '.json');
}


/**
 * @desc 排序
 * @param {排序的key} field
 */
function sortBy (field) {
  return (x, y) => {
    return x[field] - y[field]
  }
}

function GetMyBrowser () {
  var userAgent = navigator.userAgent // 取得浏览器的userAgent字符串
  var isOpera = userAgent.indexOf('Opera') > -1
  if (isOpera) {
    return 'Opera'
  }; // 判断是否Opera浏览器
  if (userAgent.indexOf('Firefox') > -1) {
    return 'FF'
  } // 判断是否Firefox浏览器
  if (userAgent.indexOf('Chrome') > -1) {
    return 'Chrome'
  }
  if (userAgent.indexOf('Safari') > -1) {
    return 'Safari'
  } // 判断是否Safari浏览器
  if (userAgent.indexOf('compatible') > -1 && userAgent.indexOf('MSIE') > -1 && !isOpera) {
    return 'IE'
  }; // 判断是否IE浏览器
}