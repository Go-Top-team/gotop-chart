function TopLow () {
  this.Datas
  this.Func = new BaseFunc()

  this.Create = function (data) {
    return this.Calculate(data)
  }

  this.Calculate = function (data) {
    this.Datas = data
    this.status = null
    var result_data = {}
    var data_set = []
    var no_inc_data_set = []
    var cur_data = {}
    var top_bar_last_period = null
    var low_bar_last_period = null
    var top, low = false
    var topPoint = null
    var lowPoint = null
    for (var i = 0, j = this.Datas.length; i < j; i++) {
      data_set = this.Datas.slice(0, i + 1)
      no_inc_data_set = this.Datas.slice(0, i)
      cur_data = this.Datas[i]
      var top_range = this.Func.top_range(no_inc_data_set, cur_data['high'], 'high')
      var low_range = this.Func.low_range(no_inc_data_set, cur_data['low'], 'low')

      var sn = this.Func.llv_bars(data_set, top_range, 'high')
      var sw = this.Func.llv_bars(data_set, top_range, 'low')

      var xn = this.Func.llv_bars(data_set, low_range, 'low')
      var xw = this.Func.llv_bars(data_set, low_range, 'high')

      var top_power = this.Func.hhv(data_set, sn + 1, 'low') > this.Func.llv(data_set, sn + 1, 'high')
      var low_power = this.Func.hhv(data_set, xn + 1, 'low') > this.Func.llv(data_set, xn + 1, 'high')

      var top_include = this.Func.count(data_set, this.condiction1, sw, 'low') > 2 && this.Func.count(data_set, this.condiction1, sn, 'high') > 2
      var low_include = this.Func.count(data_set, this.condiction2, xw, 'high') > 2 && this.Func.count(data_set, this.condiction2, xn, 'low') > 2

      var top0 = false
      if (top_range && top_power && top_include && sw > 3) {
        top0 = true
      }

      var low0 = false
      if (low_range && low_power && low_include && xw > 3) {
        low0 = true
      }

      if (top0) {
        top_bar_last_period = 0
      } else if (top_bar_last_period != null) {
        top_bar_last_period += 1
      }

      if (low0) {
        low_bar_last_period = 0
      } else if (low_bar_last_period != null) {
        low_bar_last_period += 1
      }

      if (low_bar_last_period != null) {
        top = top0 && cur_data['high'].toFixed(2) == this.Func.hhv(data_set, low_bar_last_period, 'high').toFixed(2) && low_bar_last_period > 3
      }

      if (low_bar_last_period != null) {
        low = low0 && cur_data['low'].toFixed(2) == this.Func.llv(data_set, top_bar_last_period, 'low').toFixed(2) && top_bar_last_period > 3
      }

      if (top) {
        console.log('tl顶出现:', cur_data.day)
        if (this.status == 'ding') {
          topPoint = {
            day: cur_data.day,
            value: cur_data.high
          }
        } else if (this.status == 'di') {
          lowPoint != null && (result_data[lowPoint.day] = lowPoint.value)
          topPoint = {
            day: cur_data.day,
            value: cur_data.high
          }
        }
        this.status = 'ding'
      }

      if (low) {
        console.log('tl底出现:', cur_data.day)
        if (this.status == 'di') {
          lowPoint = {
            day: cur_data.day,
            value: cur_data.low
          }
        } else if (this.status == 'ding') {
          topPoint != null && (result_data[topPoint.day] = topPoint.value)
          lowPoint = {
            day: cur_data.day,
            value: cur_data.low
          }
        }
        this.status = 'di'
      }
    }
    return result_data
  }

  this.condiction1 = function (x, y) {
    return x >= y
  }

  this.condiction2 = function (x, y) {
    return x <= y
  }

}

TopLow.Init = function (datas) {
  var tl = new TopLow()
  return tl
}
