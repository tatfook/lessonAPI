"use strict";

const Service = require("../common/service.js");
const Err = require("../common/err");
const _ = require("lodash");

class LessonService extends Service {
	/**
	 * 通过条件获取Lesson
	 * @param {*} condition  必选,对象
	 */
	async getByCondition(condition) {
		let data = await this.ctx.model.Lesson.findOne({ where: condition });
		if (data) data = data.get({ plain: true });

		return data;
	}

	/**
	 * 按条件分页查找lesson,排序,查找关联的package信息
	 * @param {*} condition 查询条件
	 * @param {*} order 排序参数
	 */
	async getLessonByPageAndSort(condition, order) {
		const ret = await this.ctx.model.Lesson.findAndCountAll({
			include: [{
				as: "packageLessons",
				model: this.ctx.model.PackageLesson,
				attributes: ["packageId"],
				required: false,
				include: [{
					as: "packages",
					model: this.ctx.model.Package,
					required: false
				}]
			}],
			where: condition, order
		});

		ret.rows.map(r => {
			let tmp = r.get();
			tmp.packages = [];

			tmp.packageLessons.forEach(o => {
				tmp.packages.push(o.packages);
			});

			delete tmp.packageLessons;
			return tmp;
		});
		return ret;
	}

	/**
	 * 根据lessonId获取packages
	 * @param {*} lessonId 必选
	 */
	async getPackagesByLessonId(lessonId) {
		return await this.ctx.model.Lesson.getPackagesByLessonId(lessonId);
	}

	/**
	 * 创建lesson,并且创建技能评分（如果传了params.skills）
	 * @param {*} params 
	 */
	async createLesson(params) {
		let lesson = await this.ctx.model.Lesson.create(params);
		if (!lesson) this.ctx.throw(500, Err.DB_ERR);
		lesson = lesson.get();

		const skills = params.skills;
		if (!skills || !_.isArray(skills)) return lesson;

		const lessonSkills = [];
		skills.forEach(r => {
			if (r.id) {
				lessonSkills.push({
					userId: params.userId,
					skillId: r.id,
					lessonId: lesson.id,
					score: r.score || 0
				});
			}
		});

		if (lessonSkills.length) {
			await this.ctx.model.LessonSkill.bulkCreate(lessonSkills);
		}
		return lesson;
	}

	/**
	 * 更新lesson,并且更新技能评分（如果传了params.skills）
	 * @param {*} params 
	 * @param {*} lessonId
	 */
	async updateLesson(params, lessonId) {
		const result = await this.ctx.model.Lesson.update(params, { where: { id: lessonId }});

		const skills = params.skills;
		if (!skills || !_.isArray(skills)) return result;

		const lessonSkills = [];
		skills.forEach(r => {
			if (r.id) {
				lessonSkills.push({
					userId: params.userId,
					skillId: r.id,
					lessonId,
					score: r.score || 0
				});
			}
		});

		if (lessonSkills.length) {
			await Promise.all([
				this.ctx.model.LessonSkill.destroy({ where: { lessonId }}),
				this.ctx.model.LessonSkill.bulkCreate(lessonSkills)
			]);
		}
		return result;
	}

	/**
	 * 删除lesson,还要删除技能评分
	 * @param {*} lessonId 
	 * @param {*} userId 
	 */
	async destroyLesson(lessonId, userId) {
		await Promise.all([
			this.ctx.model.LessonSkill.destroy({ where: { lessonId, userId }}),
			this.ctx.model.Lesson.destroy({ where: { id: lessonId, userId }})
		]);
	}

	/**
	 * 根据lessonId获取技能评分和技能名称
	 * @param {*} lessonId 
	 */
	async getSkillsAndSkillName(lessonId) {
		return await this.ctx.model.Lesson.getSkills(lessonId);
	}

	/**
	 * 增加这个lesson的某个技能的评分
	 * @param {*} userId 
	 * @param {*} lessonId 
	 * @param {*} skillId 
	 * @param {*} score 
	 */
	async addSkillScore(userId, lessonId, skillId, score) {
		return await this.ctx.model.Lesson.addSkill(userId, lessonId, skillId, score);
	}
}

module.exports = LessonService;