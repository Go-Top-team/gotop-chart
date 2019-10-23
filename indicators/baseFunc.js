
function BaseFunc () {

  this.bars_count = function (data_set) {
    return data_set.length
  }

  this.ref = function (data_set, period, args) {
    return (period < data_set.length && data_set[data_set.length - period - 1][args]) || data_set[data_set.length][args]
  }

  this.count = function (data_set, func, period, args) {
    var count = 0
    for (var i = data_set.length - 1, j = i - period; i > j; i--) {
      if (func(data_set[i][args], data_set[i - 1][args])) {
        count += 1
      }
    }
    return count
  }

  this.hhv_bars = function (data_set, period, args) {
    if (period == 1) return
    if (period != 0) data_set = data_set.slice(-period)
    var max_val = Math.max.apply(
      Math,
      data_set.map(function (o) {
        return o[args]
      })
    )
    data_set.reverse()
    for (var i = 0, j = data_set.length; i < j; i++) {
      if (max_val == data_set[i][args]) {
        return data_set.length - 1 - i
      }
    }
  }

  this.llv_bars = function (data_set, period, args) {
    if (period == 1) return
    if (period != 0) data_set = data_set.slice(-period)
    var min_val = Math.min.apply(
      Math,
      data_set.map(function (o) {
        return o[args]
      })
    )
    data_set.reverse()
    for (var i = 0, j = data_set.length; i < j; i++) {
      if (min_val == data_set[i][args]) {
        return data_set.length - 1 - i
      }
    }
  }

  this.llv = function (data_set, period, args) {
    if (period) {
      data_set = data_set.slice(-period)
    }
    var val = Math.min.apply(
      Math,
      data_set.map(function (o) {
        return o[args]
      })
    )
    return val
  }

  this.hhv = function (data_set, period, args) {
    if (period) {
      data_set = data_set.slice(-period)
    }
    var val = Math.max.apply(
      Math,
      data_set.map(function (o) {
        return o[args]
      })
    )
    return val
  }

  this.top_range = function (data_set, cmp_val, args) {
    if (data_set.length == 0) return 0
    data_set.reverse()
    var period = 0
    for (var i in data_set) {
      if (data_set[i][args] >= cmp_val) {
        return period
      }
      period += 1
    }
    return period
  }

  this.low_range = function (data_set, cmp_val, args) {
    if (data_set.length == 0) return 0
    data_set.reverse()
    var period = 0
    for (var i in data_set) {
      if (data_set[i][args] <= cmp_val) {
        return period
      }
      period += 1
    }
    return period
  }

}