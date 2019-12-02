// const md5 = require("blueimp-md5");
const { app, assert } = require('egg-mock/bootstrap');

describe('机构表单', () => {
    before(async () => {

    });

    it('001 机构', async () => {
        const user = await app.login({ roleId: 64 });
        const token = user.token;

        // 创建机构
        const organ = await app.model.LessonOrganization.create({
            name: 'org0000',
            count: 1,
            endDate: new Date('2200-01-01'),
        }).then(o => o.toJSON());
        // 创建管理员
        await app.model.LessonOrganizationClassMember.create({
            organizationId: organ.id,
            memberId: 1,
            roleId: 64,
            classId: 0,
        });

        // 创建表单1
        let form = await app
            .httpRequest()
            .post('/lessonOrganizationForms')
            .set('Authorization', `Bearer ${token}`)
            .send({
                organizationId: organ.id,
                type: 3,
                title: '测试',
                description: '报名表单',
                quizzes: [
                    {
                        title: '这是一个问答题?',
                    },
                ],
            })
            .expect(res => assert(res.statusCode === 200))
            .then(res => res.body);

        assert(form.data.id);
        const formId = form.data.id;

        // 创建表单2
        form = await app
            .httpRequest()
            .post('/lessonOrganizationForms')
            .set('Authorization', `Bearer ${token}`)
            .send({
                organizationId: organ.id,
                type: 3,
                title: '进行中的表单',
                description: '报名表单',
                quizzes: [
                    {
                        title: '这是一个问答题?',
                    },
                ],
            })
            .expect(res => assert(res.statusCode === 200))
            .then(res => res.body);
        assert(form.data.id);

        // 修改表单  改为进行中
        await app
            .httpRequest()
            .put('/lessonOrganizationForms/' + form.data.id)
            .set('Authorization', `Bearer ${token}`)
            .send({
                organizationId: organ.id,
                state: 1,
            })
            .expect(res => assert(res.statusCode === 200))
            .then(res => res.body);

        // 检索表单
        let forms = await app
            .httpRequest()
            .post(`/lessonOrganizationForms/search`)
            .send({
                organizationId: organ.id,
                state: 1,
            })
            .expect(res => assert(res.statusCode === 200))
            .then(res => res.body);
        assert(forms.data.length === 1);

        // 检索全部表单
        forms = await app
            .httpRequest()
            .post(`/lessonOrganizationForms/search`)
            .send({ organizationId: organ.id })
            .expect(res => assert(res.statusCode === 200))
            .then(res => res.body);
        assert(forms.data.length === 2);

        // 提交表单
        const submit = await app
            .httpRequest()
            .post(`/lessonOrganizationForms/${form.data.id}/submit`)
            .send({
                quizzes: [
                    {
                        title: '这是一个问答题?',
                    },
                ],
            })
            .expect(res => assert(res.statusCode === 200))
            .then(res => res.body);

        await app
            .httpRequest()
            .post(`/lessonOrganizationForms/${form.data.id}/submit`)
            .send({
                quizzes: [
                    {
                        title: '这是一个问答题?',
                    },
                ],
            })
            .expect(res => assert(res.statusCode === 200))
            .then(res => res.body);

        // 更改提交
        await app
            .httpRequest()
            .put(
                `/lessonOrganizationForms/${form.data.id}/submit/${submit.data.id}`
            )
            .set('Authorization', `Bearer ${token}`)
            .send({
                organizationId: organ.id,
                state: 1,
            })
            .expect(res => assert(res.statusCode === 200))
            .then(res => res.body);

        // 获取提交列表
        const submits = await app
            .httpRequest()
            .get(
                `/lessonOrganizationForms/${form.data.id}/submit?organizationId=${organ.id}`
            )
            .set('Authorization', `Bearer ${token}`)
            .expect(res => assert(res.statusCode === 200))
            .then(res => res.body);
        assert(submits.data.count === 2);
    });
});
