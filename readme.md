### 怎么添加新文章
添加 md 文件到 source/_posts 里面.
git commit 之后推到 main 分支. github action 会自动构建

### 插件怎么配置
根目录的 _config.yml, 这是全局的配置
```
theme: next
```
指定了使用 next 插件, next 的配置在 _config.next.yml 里面

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