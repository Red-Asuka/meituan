export default {
  dbs: "mongodb://user:pwd@localhost:27017/dbname",
  redis: {
    get host() {
      return "127.0.0.1";
    },
    get port() {
      return 6379; //Redis默认端口，不建议修改
    }
  },
  // 配置邮箱服务
  smtp: {
    get host() {
      return "smtp.126.com";
    },
    get user() {
      return "xxxxxxx@126.com"; //填入你的邮箱
    },
    get pass() {
      return "xxxxxxxxxx"; //填入你的授权码
    },
    get code() {
      //随机验证码
      return () => {
        return Math.random()
          .toString(16)
          .slice(2, 6)
          .toUpperCase();
      };
    },
    get expire() {
      // 过期时间
      return () => {
        return new Date().getTime() + 60 * 60 * 5000;
      };
    }
  }
};
