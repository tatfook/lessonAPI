const _ = require('lodash');
const Service = require('egg').Service;

class User extends Service {

	// 简化用户信息 
	getSimpleUser() {
	}

	async getUser({ userId, kid, username, cellphone, email }) {
		const user = await this.app.keepworkModel.users.findOne({
			where: {
				"$or": [
					{ id: _.toNumber(userId) || 0 },
					//{userId: (_.toNumber(kid) || 0) - 10000},
					{ username: username },
					{ cellphone: cellphone },
					{ email: email },
				]
			}
		}).then(o => o && o.toJSON());

		if (!user) return;

		user.cellphone = undefined;
		user.email = undefined;
		user.password = undefined;
		user.realname = undefined;
		user.roleId = undefined;
		user.sex = undefined;

		return user;
	}

	async getUserByUserId(userId) {
		return await this.app.keepworkModel.Users.findOne({ where: { id: userId } }).then(o => o && o.toJSON());
	}

	async getUserinfoByUserId(userId) {
		const userinfo = await this.app.keepworkModel.userinfos.findOne({ where: { userId } }).then(o => o && o.toJSON());
		if (!userinfo) await this.app.userinfos.upsert({ userId });
		return userinfo;
	}

	async token(payload, clear) {
		const config = this.app.config.self;
		const tokenExpire = config.tokenExpire || 3600 * 24 * 2;
		const token = this.app.util.jwt_encode(payload, config.secret, tokenExpire);

		await this.setToken(payload.userId, token, clear);

		return token;
	}
	// used
	async setToken(userId, token, clear = false) {
		this.ctx.state.user = { userId };

		const data = await this.app.keepworkModel.userdatas.get(userId);

		data.tokens = data.tokens || [];
		if (clear) data.tokens = [];

		data.tokens.splice(0, 0, token);
		// 只支持10个token
		if (data.tokens.length > 20) data.tokens.pop();
		await this.app.keepworkModel.userdatas.set(userId, data);
	}

	async validateToken(userId, token) {
		const data = await this.app.keepworkModel.userdatas.get(userId);
		const tokens = data.tokens || [];
		//console.log(userId, data, token);
		return _.find(tokens, o => o == token) ? true : false;
	}

	async createRegisterMsg(user) {
		const msg = await this.app.keepworkModel.messages.create({
			sender: 0,
			type: 0,
			all: 0,
			msg: {
				type: 1,
				user: {
					...user,
					password: undefined,
				},
			},
			extra: {},
		}).then(o => o && o.toJSON());
		return await this.app.keepworkModel.userMessages.create({
			userId: user.id, messageId: msg.id, state: 0
		}).then(o => o && o.toJSON());
	}

	async register(user) {
		await this.createRegisterMsg(user);
	}
}

module.exports = User;
