### 怎么启动项目
如果是新项目刚 clone 下来, themes/next 目录是空的, 需要使用
git clone https://github.com/theme-next/hexo-theme-next themes/next
添加依赖

然后再
npm run server

### 怎么添加新文章
添加 md 文件到 source/_posts 里面.
git commit 之后推到 main 分支. github action 会自动构建

### 插件怎么配置
根目录的 _config.yml, 这是全局的配置
```
theme: next
```
指定了使用 next 插件, next 的配置在 themes/next/_config.yml 里面
目前是不需要配置 next 的, 也可以在全局配置里面配置.
因为 next 目录不在 version control 里面, 所以最好在全局配置.

### giscus 的 repo id 和 category id 从哪拿的
gh api graphql -f query='
{
  repository(owner: "schneiderlin", name: "schneiderlin.github.io") {
    id # RepositoryID
    name
    discussionCategories(first: 10) {
      nodes {
        id # CategoryID
        name
      }
    }
  }
}'