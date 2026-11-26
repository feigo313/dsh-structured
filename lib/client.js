// Generated from src/client.js by scripts/build.mjs — edit src/, then run `npm run build`.
// dsh-structured client module: renders "结论：" blockquotes as cards.
/**
 * dsh-structured client
 *
 * 两层，都是纯 DOM 增强，不改消息内容、不替换 app root：
 * 1) 对话 markdown 视觉层：标题字号/层级、表格、代码块、引用块、列表、链接的排版与配色。
 * 2) 语义装饰：结论卡片、风险/验收等 callout 色调、标题关键词图标、代码块语言色。
 *
 * 只给宿主已有节点加 class/attribute，不搬 React 节点；markdown 重渲染后由 MutationObserver
 * 重新扫描。v5 皮肤走 --dss-* token，深色跟随宿主 body[data-ds-dark-theme]。
 */
window.__ModuleLoader__.load({
  id: 'dsh-structured',
  factory(require) {
    const CARD_ATTR = 'data-dsh-structured-card'
    const CARD_TYPE_ATTR = 'data-dsh-structured-card-type'
    const ICON_ATTR = 'data-dsh-structured-icon'
    const TONE_ATTR = 'data-dsh-structured-tone'
    const LANG_ATTR = 'data-dsh-structured-lang'
    const COLS_ATTR = 'data-dsh-structured-cols'
    const COL_ATTR = 'data-dsh-structured-col'
    const TAIL_ATTR = 'data-dsh-structured-tail'
    const COL_NARROW = 'narrow'
    const CODE_ATTR = 'data-dsh-structured-code'
    const SKIP_ATTR = 'data-dsh-structured-skip'
    const STATUS_ATTR = 'data-dsh-structured-status'
    const STATUS_TABLE_ATTR = 'data-dsh-structured-status-table'
    const STATUS_CELL_ATTR = 'data-dsh-structured-status-cell'
    const STATUS_PILL_ATTR = 'data-dsh-structured-status-pill'
    const CARD_LABEL_ATTR = 'data-dsh-card-label'
    const COPY_ATTR = 'data-dsh-structured-copy'
    const PERSONA_HEAD_ATTR = 'data-dsh-persona-head'
    const PERSONA_MODE_ATTR = 'data-dsh-persona-mode'
    const PERSONA_FALLBACK_ATTR = 'data-dsh-persona-fallback'
    const PERSONA_ERROR_ATTR = 'data-dsh-persona-error'
    const PERSONA_PENDING_ATTR = 'data-dsh-persona-pending'
    const PERSONA_KIND_ATTR = 'data-dsh-persona-kind'
    // 插件自己生成的节点都带这个标记：MutationObserver 据此忽略自触发，避免
    // decorate 自己的输出再被当成宿主新消息重扫一遍。
    const GENERATED_ATTR = 'data-dsh-plugin-generated'
    const LEAD_ATTR = 'data-dsh-structured-lead'
    const ROW_ATTR = 'data-dsh-structured-row'
    const ROOT_ATTR = 'data-dsh-structured'
    const THEME_ATTR = 'data-dsh-structured-theme'
    const THEMES = ['dsh', 'deepseek', 'codex', 'anthropic', 'custom']
    const STYLE_ID = 'dsh-structured-skin-style'
    const LEGACY_STYLE_ID = 'dsh-structured-card-style'

    /** 配置页常量：宿主插件详情页的 bundle 配置 slot（键 = 包名）。 */
    const CONFIG_NS = 'dsh-structured'
    const BUNDLE_CONFIG_SLOT = 'plugins.bundle.config'
    let personaTestApi = null
    const PERSONA_WHALE_JSON = "{\"schema\":\"dsh-structured/tone@1\",\"prefix\":\"我最爱💗的Boss~！！鱼鱼🐳报告📢！\",\"style\":\"搞怪/傲娇，说话干净利落，直接给结论，再补一句犀利吐槽；与朋友说话的感觉，不像报告工作。\",\"suffix\":\"本鱼鱼🐳 精准！🚀高效的完成了任务！🔥快夸我！🌝 ~ 报告完毕！~\",\"skipIn\":[\"code\",\"diff\",\"error\",\"short\",\"table\"],\"userName\":\"Boss💗\",\"selfName\":\"本鱼鱼🐳\"}"
    const DEFAULT_PROFILE_NAME = '蓝色大肥鱼'
    const DEFAULT_PROFILE_SIGNATURE = '主人，再来一碗白米饭！！~'
    const DEFAULT_AVATAR = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCACAAIADASIAAhEBAxEB/8QAHAAAAgMBAQEBAAAAAAAAAAAABgcABQgEAwIB/8QAOBAAAgEDAwMDAwIFAgYDAQAAAQIDBAURBhIhABMxByJBMlFhFCMVQlJxgQiRFiQzobHRcoLwQ//EABoBAAMBAQEBAAAAAAAAAAAAAAMEBQAGAQL/xAAtEQABBAEDAgUDBAMAAAAAAAABAAIDEQQSITEFQRMiUWGRIzLhFEJx8IGhwf/aAAwDAQACEQMRAD8A2X1Op1Ossp1Op1Ossp1Op141dVS0cXeq6mGnjLBd8rhRknAGT8nrLL26prxqrTtoqlpbjeKSCdm29svllONw3AZK8c846qPVTVKaf0FdbnQVY/VRNHSxvCFlMU0rqiEqT8Fwefj4PjoZ9NPT200tvhrdVdisutS7NLRzTLIiSSK7sJB4klZXLvu3DdlhnAcnjjZpL3nb25KG5zrpoRidfaOFTDTnUFGJJm2ICxwT+TjA/wA9EFJUU9XTR1VJPFUQSqGjlicMrg+CCOCOhmh0N6dnv/w7SWmY2XdTyvSUEKOhxym5FBU8jjII46qh6fVOnZ3rfT+7Pa3ZjJJbqtmlo6htqL7hncrERqO57mAJ8gAdeERH7SR/P9/4vRqHKYHU6odIaljvy1NNUUM9sutEyrW0E5UvCWGVIZSVZWAOGBxwfkHq+6EQQaK+wbU6nU6nXiynU6nU6yynU6nU6yynX5I6RxtJIyoiglmY4AA+T15V9XTUFFNW1k6QU8CF5JHOAqjyT0M1dVPqKooKZrJVQUcbiqqUrWMTEDd2vauVkyyhihYFfaWAOB1ll3z3yerp1WzUcrTTqz001VCywMgC5c49wGWwFOGbBIBUZ68KSno5qmapuMEJuZZlzI/c2pkELGWAwpCISFAGRk5PJ5NWa0s1gtprq2tSKMjEPsLPJIMkxqv8xwD8gDjJAIPSB1n6tXu9O62aH+CUzEM0iPuqX/G/wi8L9AB9vkgkdOY+HJP9oXw+VsfK0Hd5bLQVK3SpoKfLptNT2NxBLDIyB5Oxc/8AxXPgdfsFx09cLg1dRwQVFZBGcziHbIFPBAJGSPGfjj8dYxuVfc73FUO0xq4JJGmmkrJC6OxblgpPuyT5/PXNSW+otCtU0MDwVG0LLsLRqoPnxzjPwfHVAdINfcgfqh6La10ieWrjuNimoqetpd3dMyt25ldTlW2kZ9wQ55wVI+T11T1l8tlMtdWLHX06ohqYaWnbuxAA72QAky84OwDcQDtDMQpx9pLXWrLO8dPS3asphDtC0tS/fhdQxYhd+SuSWBK4bBO0g4IcWh/XKFgtHqyKK3lUOKqNv2ySQN7gklFBPnkAcsQPCs3TZYxY3CK2djjXCYesWgj1rou/WqdDNWVLUcrQsCtTSyRM4LY+sKVBUkkDcTjJHR50I01AdO2qilt05q6O1QLA0E0QleOnQHPaaNN5cLtGPduCAY3Esbanv0LTxrPGsUUtQ9NFKJQ6mVXddpI4XOz5P1MF88dT3vFAIzWE2QuTUsvf1HaLQ0lTEjwVVYzQTmPf2wkWxsclf+ZLeRho0Px1yR32dtN26ltlUay5T1Elv/Uyx4CtA7R1EzL9lMb4+CzICQGz1YXI0E2q4FIf9fSULlTj29qZ1z/ndAOhH03ld4LvVVEdRFBb7pc4E7iMoctXTyu654YYZF3D5Vx8dKueQ4pxjAYwa4/P4RVpa4V5e+x3ec/p6G4LDS1M6LH3YjTwOWJACnEkki5AH048gnohRldA6MGVhkEHII6XNuqqKps09wuMFN/A7dFJWSyEvJHLO+6WZwpJyiBiMEEh94AXYMnlmjmitFJHUQrBMIV7kSvuWNscqD8gHgfgdEY69kGZmk2uvqdTr5mljhheaaRY441LO7HAUDkkn4HREBDd+ucMmr7RYDB+qBWSrmVdx7LJjtM4+nbncRnneqEDjI49f6gobRZJq9pX7lOR20jX9yaTnEKZIG9sHnkLgkjAPVToGdLjU3PWFbWMZK2aWKkaTaRDCrkbSBkBgV2HaxVhGr+WPSf9XdVGv1Q8VNJmO3OVdtg2yVJ5Zgdx4RNq+By0h5DDp/GxTLKG+nKFJJoZq+EKa7vVz1DqSWturgyJ7I4lP7cCf0IPgeM55Pk9Ubxs7hW9sakhlI5Y/wDrq8q6+kntYjhp8VrEKsjjJDMeTxnOBzj5x10mlscFDD3JWeRYydiv8fYkZ5/PGeunYwMAaBspJkJ3KGpBlwM+1SMgecnx/wDv7ddFU0jxr3JXZVHgnPHVhb5qWSjIrqNoKhqzDiRSCiBvsfp8Djzz1d3KyW82yevonZiU3Im4bc+SB85wDx17azn6TRCDKikiljMEq7kHKnwR/n8dddrszXQPA0jJLANyMGAYj4YE/wCR4Iz5GD113pore1BPSwmq/wCmk0KAsXLMFYYHP8wPH9PVjV3K3w1dLV24dvYux1ZSBtPHOPOOD/jryxdLFxrZXvplruu01cZLLfp5qy1VCdupiCsSu7juR/zeNwKgnn6fcp3uDStbS3y2aho7PU088S1j1FDJ38o3dAmV8xtuKGRm5BGRkDgdZiu0tTJSGVcO9PmQAtjKfzj7eAD/APX+/TU/08ailbVa24iFqetonQuIf3BJG2+MEg/SQ9QSSPqxk8gdQurYQ0GVg3HKqYGQdWhyd1FJP+/drrEKaWXana+rsoOACQSDklmJGAARkcEnqrqeG4W6elkd+zUxNGzRSFG2sMZVlOQcHgg56+LgeyIqrn9twHwF5RjtOS3hRkMcEH2fPgxKQw1KyU0vaiLEyxEZVvbgbefZjA8ceeMnI5okkqtQq1UXp46GSzWqBKpo++snbjDM8ojIZVLk8e/axJPhSCCD1YafqrpUamqxVXGSaNIT3qSJE/T0bkqY037N7SFMs2WIGQdqhkz63CSokqILbQzxw1NRlmkYbjFEv1OF+TyAM8AsCc42m5t9HBQ0q09OpCgkkk5LMeSxPySfnosYKFK8BvuujoM9YdR0ti0FeJRVKtT2VjVV2My9x1jDFW42jdk5+M9GfSC9dJEsl9vE9TWU9JTVlLFUAue6XIBRgYzx/KMDn5+/VLCgE0oaT7qXmTugi1AX+VQehOorVRaLusFLUST3OurHeWmCe2m9qqrDd7cYO4nIJC4AJXpZStPMoeeZJaiV2mnlXJ7ju24kluSQCEyecKPtjq00ZrSzLp271UcVNaJ4IDJ+kggVUdgoUSAKoLEkAYxkePseq6if9umlk/8A6bMnHksQP/J66SGFkbi8GyVNbkSyuLXNoNXhAry3IRqoKxpnII8t+P7D/v0cenGkv+JdRJSzQLLSQL3J1dcqwzwrcEYJ+DjIDeeqDTNBLVVUwghHckqTEATyxGFyAPJ4HHWjPTzTNy05Y2i/5NKmoIlkDBmKnH0HDEcePbwTk9JdTzPCjLWncqlhw28OI2Cz9qeneTVV3jkUof1EjkAeCZH/APXVcKd3AiAZX3c4yMAc/n8D8jPTN1bYauO4VtfVxUqzzXGaKTZk7if3E++F27jz8nHVBHasZklCs4yCyjA8+B9/tno2PktMYpDmiOsn1VTpSiUartMlZLDFS/qoVkLsBg9xeSD8Yz1+6409Fa71VUkHbmoWy9M8e0xvEc8DaSODlfjx4wR0xNIWm0W+ps9VdYoEjklkq5HmRgqKg/b3ZGAd2ZATgEYOfHXv6j6i9PdUUQprVqKz1VyoZUCQRyIWmEmPYmf+oc4OFycjGM8dIHqFZIPbg/KZGN9Gu/KSlKDsEjBZlQAyDHDDOCMfY8jHRr6WaHt4vFtNFXV4uqU9bcG7Rjf3000CIChGMssoY4I84+2KO0UiTzVsCbQEDqCDkfUOf+/XHoHVFToT1TmuQgpphVU/bZp9sbdt1iLoHJH80SEbjgEkcbsh/OJdD5Upi7S0tOaf1FBeLHRzXKhNNJVQI00D4dY2KglD/Y5Hj46sLjf7VQqndqg8kjBY4ohudifsB8fcngfJHXBZrlpDWdLPWWSsjNSZcy9tOzNkFQdyOMnIUDcQeDwfnrk1DZdP2errL5c6+oWOClCgKSvbAJc8qNzE4zgHPGACSAeSbju1UeP9q6ZoiLqj6K59PK+O7Q3Kvkada5Kr9NU07vlabaquiKAdvKSI5YcnfzjAVSnqg0nap6Gorq2SM0qVvbc0pWPcJFXa0rsmcuy9tPqYBYkweSOr/oxAGwSjnajanWbP9Wl2obhdKSxww08lTRwsZJDGpdN+CcNjIwoxgHB7uSMqp6eHqNqul0dpie7VAV5fop4y2A8hHGfwPJ/7c46yLHY9Ua4v8lfTU1XUCtnZmrahdkbEk5YkALnI5CDAPAAGAKPT4fN4ruAl5nftCCZbVFUyiNN8Z2kssaghwn7gB4OBlBzwfjPPR+1IywsiEK23CkDO3K8f7dEmrtLxem+gKq+Sx0k1TtWINLJgyu3kAfIABbaPhT+T1x2btVjQxTlkWppEljc4wpzgqPvg8n/59XIZGuBISE9tItVlhvN8lurWXQEFNU36pjNQ9e+GitXuyMh0ZGfHByMgnHOPb5aS9Q/VjUd3ooHv+n7gC7LT/wAYipqaGfccKSAiPu5GFRs/g4PTf9EbLaLJdq6/xu0VUlPJBX0qgyFlDb0mREXcW5ZMDORtxznd8ae9PNF1P6eKgpqie30M6VdtqFLbWVwShDkDcAvBGSfGeeoodA98gyeRwqbjIxrDA0kH0RHpEVGrNEVcldZpbRcjUvFNRtLvjjmhcx/tyAYZPbjIyPOOMde1HoFWrY5K+VTTohHbjc5JIAGT+Oec/PRLpO0xWWzrRRDA7jyEA5ALMTx9v7ffPVuCu05Bz8dSXTOjLmRu2TQGsBzhusq+vtuv1P6kPcLzR1F7sVJFC9Ja6WoeCOKNzJEpYryWym4nk+4DIGAPr0/9GaK6DUNmr6R6Z0pYa6iuSIFalmyysA5wSDtHBOPYSNpOetNV9FDLVRVkhffCjIoDe0gkHkffjz0JVVJUUdVcJo5belvqwRXr2THNJAEICtKzlQqlpDwq8N5GCWdGdCMbwg3zevvaG3HyJJtYrSkf6e2i7Wizzw3wTCvdzJKsqYKKeRkkA5JPOeeOl7rOqgp9dzLU0j1lHNDG7Rh9rI2B7lPxwMEfI/OCG5q+4UtPJMKYR081Y7zR0rtg+RyfnHK/GRu/3zo9yqq6emq6ud5pP08UTs4wciNQ2f8A7ZOerLR9BrXKaDeQ54Rfbb2lNXwzLqSIQSF2eAQ7ZYEOCSEkXYmSoA2nIx/jqz9ONR0jeolqr9SXCe70UVbHW1BYsdzDPbJfAJKttfaMq2wKeGPQda6Z7vd6O2UCCasq50p4EBA3O7BQMnjyR1pe0ehslJpAW6tssVRcYQzGqhqkSSaRmILK2BgAY2hgeAoOSD0rIImGnnlNanEbLQdNPDU08dRTzRzQyqHjkjYMrqeQQRwR16dLP0d0lqzS7mGsuLx2UKyJbql1mkjOQVZZEwAMl8jA/t4IZnUh7Q11A2vsGwhjVmhrFqa7Ulyukcsk1LtCqSGjKjfxtYEDJfJIwTtUZwMdCHqXSXfRtjueoLbfLb2Y41WipKu2tI4lLL7d6SpuTaH427hkncQuOmt0Jant4v8Aq62W2qXNut0f8RqFJUrLJu2xKynngqzZ5HBHyD0WF5sBx2C+XDbblZC17ftW6lFWmqKxohDVSbKIDYkTg7SoUZ+lVbGSTyeeSeum3TSfwimSmm7bUf7tLOh42lfchGDkcDA4B8ecZtvUIC6axudR2BT/AKiRqieEHPbdwCVJ8EgnyPv18+mNOldapEZfdA3ZkTHDRke1h/Ygg/4Pz11TGtYwbUpUr7FlXGm9f09Bc4JJxNbq/tqhlxmkm3cLvb+nIPPkD58daFt9HXdiJqqRWmIyxjiMY/ttJOP9+sm6yFHQVjWyd+xUQKrIxwokicvg58+0oec/z/foq0RrfXlmkprXZ3mukJVTHRyRtOEQA+1T9SoMgecABQMdR+pdNM58SMj/ACqeBnCJmgrUAQiHYHKN/UMZH+/XnAlaIsVNTA7lm90UJTA524BZuRxz848DpYaC9VrvejUR3XSjQfo1VZ5IKjEkkjZKhIHGQuB5Zx+M/BbHrakkgEwtNyjVjgNKYVG3GQ5xIcL4HjPPjrnZYnRGnilUjDpRbN0TomIVjZmfAALN5P5PQL6m6x0zpKJaatENdd50L0dtBG+QnIDMcHYmc5cjwDgEjHXNd77qapq6HdPT2alkqyhgVN0s6rCX2iRiMe5GJO0ZUEfnpb37QNBbfV6r1J+vSSlkoYqxkZX7kc5UJ7mGe4Ts3ZyWJbBHyzmJheI8a9h/fhL5GQYGEjlBer6NrNpCtu1ZIv66tLb3LEO0jjAC4xg4Jb8bfx0nkCrTurn3bgRj+3V16i6jrdS6xFRUwS0tLTLsgp5RgxruOSw+GOBkfgfbqmMck9aCiRdgDHvwQ7ZwBjxjronP1ccKZEwtbbuSinQmm5LgI7mxQcFqcPEZMrggyooKkuv1L7hnHBHzs3QGrq5YLdZtVQPFVTqsdFclGaa4DaGUhv5XZedp5JB+eOs2aVKlBFKzh4pO5G5OSATkgc5wCfsOMDp9+mV/pKS2nT93pqdaKYuwOwGJjISzgjxhiWJz8k5856HnY9xihdfKDHkVJTjSbHU6FdJ6njuOp7xp8SrUihEctPUqc92N1DYOBjKlgM55+3ByVdQHsLDRVFrg4WFOkz6kXbUdg9QbvNR09NVW64WmOGTuncINu8A4+SSxGz+bPwASGnqC7paoEbtGZ3J9oYDao8sc/nAwMnLD4yQmNfXN7pc6ammfsvM5lAUEbsA4B/qx558FV/HT/ToC9+ojZJ5c4jFDlLKpozHHLHTjeyIdz8kbj5JJ5PJ/z/nql0lIaDUFLJCRu3CAA5wxfgA45wSR/wCfgdFuozT0VOaKJtuMF3J5Ln6c/PGd3H2+/XHomntq3+GOGZqypjYTGRAUSILzj3cliwUHjw3XSE+VTWu8pRdpu12nUfqBpC7V7pTmHvIrb8NJLsJjiII5x+9xx8dNRLFpay1t21HLTUNJMtPiasIWI9vJZsk+DwpJ/m2rnO0AKf00rdPp6ltZdRUdI8cdRNPRPVpGY4JhsZGXf9Le2TBH9Z6anqrQ0V+09JbJaQuLkn6SOXu7Bls7cAlRkEbsZBO0Dkdc/nE+Np7UquEPpJJN626as+qtRispKu4RNOiU1RQwptqI1jCndvdcnduAOMY8cHq61n6o2in0pUagtNne4R0wiaMvIIkzKQqM8eQzphxwA3JGQMbhmvU0c9mqq2xXKkV7nS1L07xDJVXRyrHJAypIyD8jno/rNGGb/TbS3dLu0ldBcBV1VE7hGp6cvJDGwUDO1pAhXOAQSR9z7JDHt3tMiR44NLjufqrrW63O2X+rrqSKOgZ5aemSDEZZkZCzg8n2uV8+Pjp41V2qbjbrDdqulMNXItJVzUndJVXR+6I9/OQSASOcAjjx1nLQGjNZ6tWSG10kV0FKyHs/qI4pgh53AOVBUEYJJzlh5+NXavsUOp/VKho4iKGrpLVI3/LtnYd8YUSqBgpw23cRnDBcYz0TxI45Btt3QJmPkYa5Sk/1M6GsFTpSs9UrNdKgSS1KfrKSbaSXYjdgZ9pHHt58Ejg9Kb06oaW505raliZYpiIk8oDgcn7n5H98/APWjtVactdyrKvSd/o4ameCPvNFHNjCsMB8jlSfjcD4OQVPKeg03RafjkjtM0r0807kRzupnp3TapifHkr/AFDhhg/JAaxYqcN7b2Sr8jU0tIpy+6inmiZJFUrNA4kXHBJHHkecgkfI56eVisFVU6Oo9QWef+KWyan73GO9BgHejKCclWBXCknPGOOlta0o6+lhiqgNjqO3IDzGfkZ+2cjo59Paus0dci8c7z0M69uWmY+1x5BH2YZP+5/wzktk03HyO3qlA+MnTIi7QtZSU13jq4xBDVTR9uSRkXM6AkAFsZABGM/gecABo0VXBWQ9yBw207XUEEo3ypx89ZguBnivL1sFXM0IcpSE5UCNXZhhfhcuePB5+D05PSG8vdo5nLKhC7Z48HmRQgDD+4bng+QM+3HUvPxPL4oTOHkU7w16+qNwht9fa17StJVzJG7Dk4XeVBx8ZLc/fpT6rSZNTR3f64wq5GCdoIOeB+D8dOL1R0fJqe3wzW+RILjTNuRiSvcUA4XI8EE5BOcZbxuJ6U1Y9RRs8F0gMcySyQ9xFyjlG2tz9wcf7g/PTHTXsMYAO/dAzmva8mtigPUde1VVCNFkDU0ku9ZV9rt3X2sAfjt9ofbgkecnv/4isViggaz08FVVTxBqlVeRTEd3KNvGQcc8ZHIwSDnq2vtmoa+i/iEZ7dQDs3qeGwMDI/GB9vGOgDUNvFFWFe9HLLCo7xT6RkBgPzgEHP2OMcZNMNBQmua8UUPz3fGr6S83KNpqeluMNTLTFR++I5VdlO74YDaM8YJznIxsTS+qLPrmW2XTTtcHt6zs0wli924RMOzhh7GDFWyPOw4JHWM9dW1KaEXBTtjlwrxgfUPv/cff5A58Do3/ANNGvaGy18el5qYd5rkbhDUyY2piHtyKQSuDsBw2WHubgY5j9RhLjfdV8VwLdkeet3pVqS+6xuN/W3fqoZwiU70QRmGAOZEwGxwRxu+rJOF6ObxpnTdw0ne/Tyy2xUu1JZqSKeWSH61QboR3DjuEFM58Z+c5wzY6uOWkmkEq4C8tj6Tjxj/956pf4+w1E+n5KCtVIqf9T+uSMdhv3MCHg/VtIOPt1LEjyK9EzSX3o36UVmmrtRakukgoqpIigoqQhg24bS0zgAHhuFRVA2qSWYEktv1bSWDXr1oWaMVttDVjRBcsYZVWPAOMnFQwJz4VRjjogqL9b6C1y1VxrYaJKQfvyyttjX43FmPC8g5J8Y6QHr/6tWmAsunLmlVcJ7dPSpPRSLKtPvmi9zODgHYHxg5Bwft16wOkf5gseF5aStUlJrnUOuLrVLTQXPK0VG0mWjjZgdzlsbTwDt+CT+Oh2/rHVXeorI6oIHrO4YEKsHUI6hmI+fdkD8nPQJ6N2C+6w1m0IuO9KSEOgq5yUWI+0lQcn2nbnH3X89Mn1B0TfdFUNDe7nPbJaatqlo0WjneRmbtySBjuRccRkcZ5PXQQSxMIZdHhSJYJC4vO689LUDXG4UlrjGGkquzFh9oBbwTweAW8fOPjyDTT8ncoEiuEe2RSyOCCD7WK8g8/HPQvo+OvWvpbjSMtNJSusoM0JO1wc4K8ZIx9/wD10Y1FRFI6xR5cp9bscsWP3/8APTD71V2SMjm1tyqy5tTh5IpAZJEyuE+Pkc/GRjpwelmn6C1WU19NUCqlrTvMgBCovgIqnx4GT5JHPAUAMpAK3S9TYDaZpLjWVKSUUoQ7XiUJ+4W/pBZx84z+cdNDS1tNpssNGSCwyzYUAAnkjqR1Ge49PG/yPVP4EOl+r2+F/9k='
    let personaModeState = {
      enabled: false,
      name: DEFAULT_PROFILE_NAME,
      signature: DEFAULT_PROFILE_SIGNATURE,
      avatar: '',
      prefix: '',
      suffix: '',
    }
    const personaRenderCache = new WeakMap()
    /** markdown 在 PersonaMode 激活那一刻就已存在：旧历史不回溯、不重写。 */
    const personaLegacyMarkdowns = new WeakSet()
    /** 激活时的最大 data-chat-turn；虚拟列表把旧消息重新挂回 DOM 时据此识别。 */
    let personaTurnWatermark = null
    /** 解析/校验失败先进入待定窗口，块完成且仍非法才显示错误。 */
    const personaPendingErrors = new WeakMap()
    const personaGraceTimers = new Set()
    const PERSONA_GRACE_MS = 500

    /**
     * 设置页（1.2.0 单页）：标题行 = 插件总开关；区块顺序 外观 → 人格 → 输出深度 → 预览。
     * 服务端 schema 尚未同步的新字段（enabled / personaHeadEnabled / personaInnerOsEnabled /
     * themeCustom / custom 主题）一律按字段名探测：存在才读写，缺字段时降级，不假设 schema 已更新。
     */
    const MASTER_FIELD = 'enabled'
    const MASTER_FALLBACK_FIELD = 'defaultEnabled'
    const HEAD_FIELD = 'personaHeadEnabled'
    const INNER_OS_FIELD = 'personaInnerOsEnabled'
    const CUSTOM_THEME = 'custom'
    const SIDEBAR_PANEL_ID = 'dsh-structured'
    const SIDEBAR_ENTRY_SLOT = 'sidebar.panellist'
    const MAIN_PANEL_SLOT = 'main'
    const DEPTH_OPTIONS = [
      { value: 'beginner', label: '入门', hint: '多类比、先讲懂；术语首次出现用一句人话解释。' },
      { value: 'general', label: '普通', hint: '默认；结论直接说，需要时才解释。' },
      { value: 'expert', label: '专业', hint: '少类比，多机制、边界与取舍；术语直接用。' },
    ]
    const DEPTH_LABELS = { beginner: '入门', general: '普通', expert: '专业' }
    /** 外观顶部只放四套默认主题；「自定义」单独一行，选中后才显示主 / 副 / 辅三色。 */
    const THEME_PRESETS = [
      { id: 'dsh', label: 'DSH', accent: '#111827', soft: '#f3f4f6' },
      { id: 'deepseek', label: 'DeepSeek', accent: '#2563EB', soft: '#eff6ff' },
      { id: 'codex', label: 'Codex', accent: '#10A37F', soft: '#ecfdf5' },
      { id: 'anthropic', label: 'Anthropic', accent: '#CC785C', soft: '#fdf1ec' },
    ]
    const CUSTOM_THEME_PRESET = { id: CUSTOM_THEME, label: '自定义', accent: '#4B5563', soft: '#eef0f3' }
    /**
     * 风格预设：只描述说话方式，不混入输出深度 / 结构 / 编号。
     * 「简洁」旧名「简洁专业」带深度词，1.2.0 起改名。
     */
    const STYLE_PRESETS = [
      { id: 'tsundere', label: '傲娇', style: '傲娇，嘴硬心软：喜欢怼人，但每句话都为对方着想；结论直接不绕弯，偶尔「噗」一下，开心时加 🐳💗，不滥用表情。', sample: '能上。别指望我夸你，分两步走。', os: '又改一版…尾巴都快敲酸了，Boss 满意就算了。' },
      { id: 'gentle', label: '温柔', style: '温柔耐心：先接住情绪再给结论；句子短、语气软，不催促，不空洞安慰。', sample: '可以的，我们分两步走，别急。', os: 'Boss 别急，慢慢来，我在。' },
      { id: 'concise', label: '简洁', style: '能一句话说完就不说第二句：直接给结论和下一步，不用形容词，不寒暄，不重复。', sample: '能上，分两步。', os: '改完，下一步。' },
      { id: 'funny', label: '搞怪', style: '搞怪跳脱，爱用夸张比喻和表情；事实与边界照常写清楚，不拿风险开玩笑。', sample: '能上，别翻车；分两步走。', os: '这版改得我鱼鳍都打结了。' },
      { id: 'sharp', label: '毒舌', style: '毒舌但善意：先吐槽再给可行建议，只怼方案不怼人，不人身攻击。', sample: '这方案还行，别磨叽，分两步。', os: '这方案再不改，我就先吐槽为敬。' },
      { id: 'energetic', label: '元气', style: '元气满满，语速快、感叹号多，主动给下一步；不喊口号，不灌鸡汤。', sample: '能上！分两步走，冲！', os: '搞定！下一单！' },
      { id: 'selfmock', label: '自嘲', style: '习惯自嘲，拿自己开涮化解压力；结论仍然直接，不把自嘲当结论。', sample: '能上。我这脑子终于没掉链子，分两步。', os: '我又来改稿了，鱼鱼叹气。' },
      { id: 'chuuni', label: '中二', style: '中二一点，爱用「封印」「结界」这类词；规则和事实不打折。', sample: '准了：分两步走。', os: '封印又松了一格。' },
      { id: 'slacker', label: '摆烂', style: '摆烂口吻，承认麻烦但事情照做；不劝退、不敷衍。', sample: '能上……行吧，分两步。', os: '不想改，但还是改了。' },
      { id: 'serious', label: '认真', style: '认真克制：先给判断，再给依据和边界；不抖机灵，不客套。', sample: '能上。按两步走，先灰度。', os: '这一版按边界收口，不扩范围。' },
    ]
    /** 自定义三色：字段与 themeCustom JSON 的 schema 契约见 docs/PLAN-CUSTOM-THEME.md。 */
    const PALETTE_SCHEMA = 'dsh-structured/palette@1'
    const PALETTE_KEYS = ['primary', 'secondary', 'tertiary']
    /* ---------------- 设置页 i18n：跟随 DSH 宿主语言（zh / en，未知语言回退 en） ---------------- */
    const I18N_FALLBACK = 'en'
    /** 扁平文案字典：[中文, English]；中文逐字沿用 1.2.3 原文。key 缺失先回退 en，再回退 key 本身。 */
    const I18N_TEXT = {
      'meta.eyebrow': ['DSH 插件 · 设置', "DSH plugin · Settings"],
      'meta.title': ['结构化输出', "Structured Output"],
      'meta.subtitle': ['卡片始终按多卡输出；人格与深度只改呈现。', "Replies always render as multiple cards; persona and depth only change the presentation."],
      'meta.unavailable': ['插件未加载或配置暂不可用。', "Plugin not loaded or configuration unavailable."],
      'meta.readonly': ['当前配置被更高层覆盖（home patch / CLI overlay），此处只读。', "This configuration is overridden by a higher layer (home patch / CLI overlay); read-only here."],
      'meta.masterSwitch': ['插件总开关', "Plugin master switch"],
      'meta.statusLine': ['插件 {master} · 人格 {persona} · 身份头 {head} · 深度 {depth}', "Plugin {master} · Persona {persona} · Identity head {head} · Depth {depth}"],
      'meta.on': ['已开启', "On"],
      'meta.off': ['已关闭', "Off"],
      'meta.headOn': ['已开', "On"],
      'meta.headOff': ['已关', "Off"],
      'meta.current': ['当前', "Current"],
      'meta.live': ['立即生效', "Live"],

      'appearance.title': ['外观', "Appearance"],
      'appearance.desc': ['主题预设或自定义三色；自定义即时生效，对比度自动修正。', "Theme presets or a custom three-color palette; custom colors apply instantly with automatic contrast correction."],
      'appearance.custom': ['自定义', "Custom"],
      'appearance.resetPalette': ['恢复默认三色', "Reset to default colors"],
      'appearance.customHint': ['软底透明度 10–14%、饱和上限 65% 由系统强制；切回预设会保留上次三色。', "Soft tints use 10–14% opacity and a 65% saturation cap; switching back to a preset keeps your last custom colors."],

      'palette.primary': ['主色', "Primary"],
      'palette.secondary': ['副色', "Secondary"],
      'palette.tertiary': ['辅色', "Tertiary"],
      'palette.invalidHex': ['{label}不是合法 HEX：{value}', "{label} is not a valid HEX color: {value}"],
      'palette.tooLarge': ['调色板超过 4KB', "Palette exceeds 4KB"],
      'palette.jsonInvalid': ['调色板 JSON 解析失败', "Failed to parse palette JSON"],
      'palette.notObject': ['调色板必须是对象', "Palette must be an object"],
      'palette.schema': ['schema 必须是 {schema}', "schema must be {schema}"],

      'picker.current': ['当前 {color}', "Current {color}"],
      'picker.svAria': ['{label} 饱和度与明度', "{label} saturation and brightness"],
      'picker.hueAria': ['色相', "Hue"],
      'picker.hexAria': ['HEX', "HEX"],
      'picker.eyedropperTitle': ['吸管取色', "Pick a color from the screen"],
      'picker.eyedropperUnsupported': ['宿主不支持吸管', "EyeDropper is not supported by the host"],
      'picker.eyedropper': ['吸管', "Eyedropper"],
      'picker.contrastValue': ['对比度 {ratios} · {state}', "Contrast {ratios} · {state}"],
      'picker.contrastPass': ['通过', "Pass"],
      'picker.contrastAutoFixed': ['自动修正', "Auto-fixed"],
      'picker.hueOk': ['色相区分 ≥25°', "Hues differ by ≥25°"],
      'picker.hueClose': ['色相接近，状态色会拉开', "Hues are close; status colors will separate"],
      'picker.cancel': ['取消', "Cancel"],
      'picker.previewConclusionText': ['能上，分两步走。', "It ships, in two steps."],
      'picker.previewSuggestionText': ['先跑一条链路。', "Run one real path first."],
      'picker.confirm': ['确认', "Confirm"],

      'behavior.title': ['行为', "Behavior"],
      'behavior.desc': ['注入与联动开关；与外观、人格、深度互不影响。', "Injection and integration switches; independent of appearance, persona, and depth."],
      'behavior.defaultEnabled': ['新会话默认开启', "New sessions on by default"],
      'behavior.defaultEnabledHint': ['新会话默认注入结构化提示词', "Inject the structured prompt into new sessions by default"],
      'behavior.subagents': ['子代理注入', "Subagent injection"],
      'behavior.subagentsHint': ['子代理会话也注入（其产出不直接面向用户）', "Inject in subagent sessions too (their output is not shown directly to users)"],
      'behavior.genui': ['GenUI 联动', "GenUI integration"],
      'behavior.genuiHint': ['auto：检测到 dsh-genui 才追加 dsh-ui 路由规则', "auto: add dsh-ui routing rules only when dsh-genui is detected"],
      'behavior.sidebar': ['侧边栏入口', "Sidebar entry"],
      'behavior.sidebarHint': ['在侧边栏显示「结构化输出」入口；关闭只隐藏入口，插件板块里的设置页仍可用', "Show the “Structured Output” entry in the sidebar; turning it off only hides the entry, and the settings page in the plugin panel still works"],
      'sidebar.entry': ['结构化输出', "Structured Output"],

      'depth.title': ['输出深度', "Output depth"],
      'depth.desc': ['只改变解释量，不改卡片结构、编号与事实；分层参考 eli5 skill。', "Changes only how much is explained; card structure, numbering, and facts stay the same; layering follows the eli5 skill."],
      'depth.beginner': ['入门', "Beginner"],
      'depth.beginnerHint': ['多类比、先讲懂；术语首次出现用一句人话解释。', "More analogies, explain first; define each new term in one plain sentence."],
      'depth.general': ['普通', "Standard"],
      'depth.generalHint': ['默认；结论直接说，需要时才解释。', "Default; state the conclusion directly and explain only when needed."],
      'depth.expert': ['专业', "Expert"],
      'depth.expertHint': ['少类比，多机制、边界与取舍；术语直接用。', "Fewer analogies; focus on mechanisms, boundaries, and trade-offs; use technical terms directly."],
      'depth.note': ['三档始终有一档，不提供关闭；默认普通。受众分层参考 eli5 skill（Explain Like I\'m 5）：入门按 5–15 岁 / 非技术读者校准，普通为默认，专业面向工程师 / 专家。入门不等于幼稚化：不卖萌、不省略边界。', "Exactly one level is always active and there is no off switch; the default is Standard. Audience layering follows the eli5 skill (Explain Like I'm 5): Beginner targets ages 5–15 / non-technical readers, Standard is the default, and Expert targets engineers / specialists. Beginner is not childish: no baby talk and no omitted boundaries."],

      'preview.title': ['预览', "Preview"],
      'preview.allCards': ['全部卡片', "All cards"],
      'preview.depthChip': ['深度 · {depth}', "Depth · {depth}"],
      'preview.desc': ['结论 / 讲解 / 建议 / 风险 / 短答 / 表格 / 代码一次看全；深度立即生效，人格 / 身份头保存后更新。', "Conclusion / explain / suggestion / risk / short answer / table / code at a glance; depth applies immediately, persona / identity head after saving."],
      'preview.card.conclusion': ['结论', "Conclusion"],
      'preview.card.explain': ['讲解', "Explain"],
      'preview.card.suggestion': ['建议', "Suggestion"],
      'preview.card.risk': ['风险', "Risk"],
      'preview.card.short': ['短答', "Short answer"],
      'preview.card.table': ['表格', "Table"],
      'preview.card.code': ['代码', "Code"],

      'persona.title': ['人格', "Persona"],
      'persona.masterSwitch': ['人格总开关', "Persona master switch"],
      'persona.note': ['只控制说话风格、称呼与身份头；关闭后仍按多卡输出，只去掉风格和身份头。保存后全局生效（新消息使用）；当前正在生成的回合不回溯。', "Controls only speaking style, forms of address, and the identity head; when off, replies still render multiple cards — only style and the identity head are removed. Saving applies globally to new messages; in-flight turns are not rewritten."],
      'persona.headHint': ['身份头 · 只控制头像 / 名字 / 签名；人格关闭时自动关闭', "Identity head · controls only avatar / name / signature; turns off automatically when persona is off"],
      'persona.headSwitch': ['身份头', "Identity head"],
      'persona.avatarTitle': ['点击更换头像', "Click to change avatar"],
      'persona.avatarAlt': ['头像', "Avatar"],
      'persona.displayName': ['显示名', "Display name"],
      'persona.signature': ['个性签名', "Signature"],
      'persona.switch': ['切换人格', "Switch persona"],
      'persona.templateGroupAria': ['选择起点模板', "Choose a starting template"],
      'persona.saveTemplate': ['＋ 将当前草稿另存为模板', "＋ Save current draft as a template"],
      'persona.deleteTemplate': ['删除模板', "Delete template"],
      'persona.nickname': ['昵称', "Nickname"],
      'persona.nicknameHint': ['怎么称呼你', "How you are addressed"],
      'persona.selfName': ['自称', "Self-reference"],
      'persona.selfNameHint': ['怎么称呼自己', "How the persona refers to itself"],
      'persona.styleGroup': ['风格预设', "Style presets"],
      'persona.styleHint': ['风格 · 点击套用', "Style · click to apply"],
      'persona.presetHint1': ['预设同时套用下方「说话方式」与「内心OS」；风格只描述说话方式，不含深度。', "A preset fills both “Speaking style” and “Inner OS” below; style describes speaking only, not depth."],
      'persona.presetHint2': ['预设只改语气；称呼/自称始终以输入框为准。', "Presets change tone only; nickname / self-reference always come from the inputs."],
      'persona.speakingStyle': ['说话方式', "Speaking style"],
      'persona.speakingStyleHint': ['性格 · 只写说话倾向，不写深度与结构', "Personality · tone only; no depth or structure"],
      'persona.insertEmoji': ['插入表情', "Insert emoji"],
      'persona.chooseEmoji': ['选择表情', "Choose emoji"],
      'persona.innerOs': ['内心OS', "Inner OS"],
      'persona.innerOsHint': ['跟随当前风格「{preset}」· 按上一条任务的情绪写，≤30 字；不解释任务、不重复', "Follows the current style “{preset}” · write from the previous task's mood, ≤30 characters; no task explanation, no repetition"],
      'persona.innerOsUnsupported': ['服务端未提供该字段', "Field not provided by the server"],
      'persona.rules': ['风格预设同时套用说话方式与内心OS；内心OS 由模型按当前风格生成，复制不带；代码 / 表格等正文保持中性；保存只影响新回复。', "Presets apply to both speaking style and Inner OS; Inner OS is generated by the model for the current style and is not copied; code / tables and other body content stay neutral; saving affects only new replies."],
      'persona.reset': ['恢复默认', "Reset to default"],
      'persona.save': ['保存', "Save"],
      'persona.customPreset': ['自定义', "Custom"],
      'persona.customStyle': ['（自定义风格）', "(Custom style)"],
      'persona.templateEmpty': ['模板已全部删除 · 用底部「恢复默认」找回', "All templates deleted · use “Reset to default” at the bottom to restore"],
      'persona.defaultTemplateDesc': ['默认预设', "Default preset"],
      'persona.templateFallbackName': ['我的模板', "My template"],
      'persona.savedTemplate': ['已另存为模板：{label}', "Saved as template: {label}"],
      'persona.customTemplateDesc': ['自定义 · {date}', "Custom · {date}"],
      'persona.resetNotice': ['已恢复默认模板', "Default template restored"],
      'persona.discardConfirm': ['有未保存修改，确认丢弃？', "You have unsaved changes. Discard them?"],
      'persona.invalidConfig': ['当前配置不是有效的 tone@1，已载入默认模板；保存会覆盖。', "Current configuration is not a valid tone@1; the default template has been loaded. Saving will overwrite it."],
      'persona.avatarType': ['头像仅支持 png / jpeg / webp', "Avatar must be png / jpeg / webp"],
      'persona.avatarTooLarge': ['头像压缩后仍超过 64KB，请换一张更小的图', "Avatar is still over 64KB after compression; choose a smaller image"],
      'persona.avatarUpdated': ['头像已更新，保存后生效', "Avatar updated; applies after saving"],
      'persona.avatarFailed': ['头像处理失败：{message}', "Avatar processing failed: {message}"],
      'persona.avatarUnreadable': ['头像图片无法读取', "Cannot read the avatar image"],
      'persona.avatarReadFailed': ['头像读取失败', "Failed to read the avatar"],
      'persona.writeRejected': ['批量写入被宿主拒绝', "Batch write rejected by the host"],
      'persona.writeFailed': ['批量写入失败：{message}', "Batch write failed: {message}"],
      'persona.missingReadApi': ['缺少配置读回接口，无法校验保存结果', "Missing config read-back API; cannot verify the save"],
      'persona.readbackMismatch': ['写后读回校验失败：{fields}', "Post-write read-back mismatch: {fields}"],
      'persona.rollbackFailed': ['回滚失败，profile 可能半保存：{message}；{errors}', "Rollback failed; the profile may be partially saved: {message}; {errors}"],

      'tone.emptyJson': ['空 JSON', "Empty JSON"],
      'tone.tooLarge': ['超过 64KB', "Over 64KB"],
      'tone.parseFailed': ['JSON 解析失败：{message}', "JSON parse failed: {message}"],
      'tone.notObject': ['顶层必须是对象', "Top level must be an object"],
      'tone.schema': ['schema 必须是 {schema}', "schema must be {schema}"],
      'tone.unknownField': ['未知字段', "Unknown field"],
      'tone.prefix': ['prefix 需为 ≤80 字字符串', "prefix must be a string of ≤80 characters"],
      'tone.style': ['style 必填且 ≤1200 字', "style is required and must be ≤1200 characters"],
      'tone.suffix': ['suffix 需为 ≤80 字字符串', "suffix must be a string of ≤80 characters"],
      'tone.userName': ['userName 需为 ≤20 字字符串', "userName must be a string of ≤20 characters"],
      'tone.selfName': ['selfName 需为 ≤20 字字符串', "selfName must be a string of ≤20 characters"],
      'tone.skipIn': ['skipIn 无效', "skipIn is invalid"],
      'tone.legacy': ['旧格式：只接受 tone@1（schema/prefix/style/suffix/skipIn），文本已保留，请迁移后再保存', "Legacy format: only tone@1 is accepted (schema/prefix/style/suffix/skipIn); the text was preserved — migrate it before saving"],

      'status.off': ['已关闭', "Off"],
      'status.saved': ['已保存，全局生效（新消息使用）', "Saved; applies globally to new messages"],
      'status.saving': ['保存中', "Saving"],
      'status.savedOff': ['已保存，未启用', "Saved, not enabled"],
      'status.failed': ['保存失败', "Save failed"],
      'status.importInvalid': ['JSON 无效', "Invalid JSON"],
      'status.tooLarge': ['超过 64KB', "Over 64KB"],
      'status.readonly': ['只读', "Read-only"],

      'style.tsundere.label': ['傲娇', "Tsundere"],
      'style.tsundere.prompt': ['傲娇，嘴硬心软：喜欢怼人，但每句话都为对方着想；结论直接不绕弯，偶尔「噗」一下，开心时加 🐳💗，不滥用表情。', "Tsundere, tough outside and caring inside: tease the user, but every line looks out for them; lead with the conclusion, occasionally huff, add 🐳💗 when happy, and use emoji sparingly."],
      'style.tsundere.sample': ['能上。别指望我夸你，分两步走。', "It can ship. Don't expect praise — two steps."],
      'style.tsundere.os': ['又改一版…尾巴都快敲酸了，Boss 满意就算了。', "Another revision… my tail is sore. As long as the boss is happy."],
      'style.gentle.label': ['温柔', "Gentle"],
      'style.gentle.prompt': ['温柔耐心：先接住情绪再给结论；句子短、语气软，不催促，不空洞安慰。', "Gentle and patient: acknowledge feelings before giving the conclusion; short sentences, soft tone, never rush, no empty comfort."],
      'style.gentle.sample': ['可以的，我们分两步走，别急。', "Sure, we can do it in two steps. No rush."],
      'style.gentle.os': ['Boss 别急，慢慢来，我在。', "Don't worry, boss. I'm here."],
      'style.concise.label': ['简洁', "Concise"],
      'style.concise.prompt': ['能一句话说完就不说第二句：直接给结论和下一步，不用形容词，不寒暄，不重复。', "If one sentence is enough, stop there: give the conclusion and the next step directly, no adjectives, no small talk, no repetition."],
      'style.concise.sample': ['能上，分两步。', "It ships, two steps."],
      'style.concise.os': ['改完，下一步。', "Done. Next."],
      'style.funny.label': ['搞怪', "Playful"],
      'style.funny.prompt': ['搞怪跳脱，爱用夸张比喻和表情；事实与边界照常写清楚，不拿风险开玩笑。', "Goofy and playful: use exaggerated metaphors and emoji, but keep facts and boundaries clear; never joke about risk."],
      'style.funny.sample': ['能上，别翻车；分两步走。', "It ships — just don't crash. Two steps."],
      'style.funny.os': ['这版改得我鱼鳍都打结了。', "This revision tied my fins in knots."],
      'style.sharp.label': ['毒舌', "Snarky"],
      'style.sharp.prompt': ['毒舌但善意：先吐槽再给可行建议，只怼方案不怼人，不人身攻击。', "Sharp-tongued but kind: quip first, then give workable advice; attack the plan, not the person, and never get personal."],
      'style.sharp.sample': ['这方案还行，别磨叽，分两步。', "This plan is okay. Stop dawdling — two steps."],
      'style.sharp.os': ['这方案再不改，我就先吐槽为敬。', "If this plan doesn't change, I'll start roasting it."],
      'style.energetic.label': ['元气', "Energetic"],
      'style.energetic.prompt': ['元气满满，语速快、感叹号多，主动给下一步；不喊口号，不灌鸡汤。', "Full of energy: fast pace, lots of exclamation marks, always offer the next step; no slogans, no chicken soup."],
      'style.energetic.sample': ['能上！分两步走，冲！', "It ships! Two steps — go!"],
      'style.energetic.os': ['搞定！下一单！', "Done! Next one!"],
      'style.selfmock.label': ['自嘲', "Self-deprecating"],
      'style.selfmock.prompt': ['习惯自嘲，拿自己开涮化解压力；结论仍然直接，不把自嘲当结论。', "Self-deprecating: joke about yourself to defuse pressure; still lead with the conclusion and never let the joke replace it."],
      'style.selfmock.sample': ['能上。我这脑子终于没掉链子，分两步。', "It ships. My brain finally didn't miss this time — two steps."],
      'style.selfmock.os': ['我又来改稿了，鱼鱼叹气。', "Editing again. Fishy sigh."],
      'style.chuuni.label': ['中二', "Chuunibyou"],
      'style.chuuni.prompt': ['中二一点，爱用「封印」「结界」这类词；规则和事实不打折。', "A little chuunibyou: enjoy words like “seal” and “barrier”; rules and facts are never compromised."],
      'style.chuuni.sample': ['准了：分两步走。', "Granted: two steps."],
      'style.chuuni.os': ['封印又松了一格。', "Another notch loosened on the seal."],
      'style.slacker.label': ['摆烂', "Slacker"],
      'style.slacker.prompt': ['摆烂口吻，承认麻烦但事情照做；不劝退、不敷衍。', "Slacker tone: admit the hassle but still get it done; never discourage the user or phone it in."],
      'style.slacker.sample': ['能上……行吧，分两步。', "It ships… fine, two steps."],
      'style.slacker.os': ['不想改，但还是改了。', "Didn't want to edit, but I did."],
      'style.serious.label': ['认真', "Serious"],
      'style.serious.prompt': ['认真克制：先给判断，再给依据和边界；不抖机灵，不客套。', "Serious and restrained: judgment first, then evidence and boundaries; no wisecracks, no pleasantries."],
      'style.serious.sample': ['能上。按两步走，先灰度。', "It ships. Two steps, canary first."],
      'style.serious.os': ['这一版按边界收口，不扩范围。', "This version closes scope by boundaries; no expansion."],
    }

    /** 预览区演示内容：结构与文案一起双语；不进扁平字典，避免把整段示例拆成几十个 key。 */
    const I18N_PREVIEW = {
      zh: {
        samples: {
          playful: {
            tableLead: '两条主线，先看验收状态：',
            codeLead: '动态加载这一处，改成这样：',
            normal: {
              lead: '这版能上，但别一步到位。',
              points: ['先灰度一周，再谈默认开启。', '回滚脚本没验收，不加自动更新。'],
              steps: ['先拿现网账号跑一条真实链路。', '把失败 / 回滚 / 权限边界写进验收。', '灰度一周，再决定要不要默认开启。'],
              risk: '自动更新会跳过手动确认；回滚没演练，等于没有。',
            },
          },
          direct: {
            tableLead: '两条主线，先看验收状态：',
            codeLead: '动态加载这一处，改成这样：',
            normal: {
              lead: '能上，分两步走。',
              points: ['灰度一周再定默认开启。', '回滚没验收，不动自动更新。'],
              steps: ['跑通一条真实链路。', '验收失败 / 回滚 / 权限边界。', '一周后决定默认开关。'],
              risk: '自动更新跳过确认；回滚未演练。',
            },
          },
          soft: {
            tableLead: '两条主线，先看验收状态：',
            codeLead: '动态加载这一处，改成这样：',
            normal: {
              lead: '可以先上一版，稳一点。',
              points: ['建议先灰度一周看看。', '自动更新等回滚验收后再加。'],
              steps: ['先用现网账号跑一条链路看看。', '把回滚和权限边界补进验收。', '观察一周，我们再定默认开启。'],
              risk: '自动更新会跳过确认，回滚还没演练过，先别开。',
            },
          },
        },
        table: {
          head: ['模块', '状态', '说明'],
          rows: [
            ['注入链路', 'success', '新会话 system prompt 命中'],
            ['表格渲染', 'success', '斑马纹与状态列生效'],
            ['代码皮肤', 'success', '横幅与语言色点正常'],
            ['暗色主题', 'warn', '部分色值对比度待校'],
            ['子代理注入', 'warn', '默认关闭，待拍板'],
            ['自动更新', 'error', '回滚脚本未验收'],
          ],
        },
        statusText: { success: '✅ 通过', warn: '⚠ 观察', error: '❌ 阻断' },
        short: '现在三点，周报我顺手排好了。',
        cards: {
          lead: '能上，分两步走。',
          body: '灰度一周；回滚没验收，不动自动更新。',
          tableLead: '两条主线，先看验收状态：',
          beginnerAnalogy: '像试水温：先用手背试，再决定要不要下水。',
          beginnerExample: '先拿一个现网账号跑灰度。',
          generalAnalogy: '像试水温：先用手背试。',
          expertExample: '现网账号跑 5 分钟灰度，盯错误率与回滚点。',
          steps: ['跑通一条真实链路。', '验收失败 / 回滚边界。'],
          risk: '自动更新跳过确认；回滚未演练。',
          short: '收到，灰阶主题已按宿主配色对齐。',
          tableHead: ['检查项', '状态', '说明'],
          tableRows: [['测试', '✅ 通过', '127/127'], ['发布', '⚠ 待做', '等 Boss 点头']],
        },
      },
      en: {
        samples: {
          playful: {
            tableLead: 'Two tracks — start with acceptance status:',
            codeLead: 'For the dynamic loading, change it to this:',
            normal: {
              lead: 'This version can ship, but not all at once.',
              points: ['Canary for a week first, then discuss enabling by default.', 'No auto-update until the rollback script passes acceptance.'],
              steps: ['Run one real path with a production account first.', 'Write failure / rollback / permission boundaries into acceptance.', 'Canary for a week, then decide whether to enable by default.'],
              risk: 'Auto-update skips manual confirmation; an untested rollback is as good as none.',
            },
          },
          direct: {
            tableLead: 'Two tracks — start with acceptance status:',
            codeLead: 'For the dynamic loading, change it to this:',
            normal: {
              lead: 'It ships, in two steps.',
              points: ['Canary for a week, then set the default.', 'No auto-update until rollback passes acceptance.'],
              steps: ['Run one real path.', 'Accept failure / rollback / permission boundaries.', 'Decide the default toggle in a week.'],
              risk: 'Auto-update skips confirmation; rollback untested.',
            },
          },
          soft: {
            tableLead: 'Two tracks — start with acceptance status:',
            codeLead: 'For the dynamic loading, change it to this:',
            normal: {
              lead: 'We can ship a first version — carefully.',
              points: ["I'd canary for a week first.", 'Add auto-update after rollback acceptance.'],
              steps: ['Try one path with a production account first.', 'Add rollback and permission boundaries to acceptance.', 'Watch for a week, then decide the default.'],
              risk: "Auto-update skips confirmation and rollback is untested; let's not enable it yet.",
            },
          },
        },
        table: {
          head: ['Module', 'Status', 'Notes'],
          rows: [
            ['Injection path', 'success', 'Hit by the new-session system prompt'],
            ['Table rendering', 'success', 'Zebra stripes and status column working'],
            ['Code skin', 'success', 'Banner and language colors normal'],
            ['Dark theme', 'warn', 'Some contrast values need review'],
            ['Subagent injection', 'warn', 'Off by default, pending decision'],
            ['Auto-update', 'error', 'Rollback script not accepted yet'],
          ],
        },
        statusText: { success: '✅ Pass', warn: '⚠ Watch', error: '❌ Blocked' },
        short: "It's 3 p.m.; I queued the weekly report for you.",
        cards: {
          lead: 'It ships, in two steps.',
          body: 'Canary for a week; no auto-update until rollback passes acceptance.',
          tableLead: 'Two tracks — start with acceptance status:',
          beginnerAnalogy: 'Like testing water: touch it with the back of your hand before jumping in.',
          beginnerExample: 'Run a canary with one production account first.',
          generalAnalogy: 'Like testing water: touch it with the back of your hand.',
          expertExample: 'Run a 5-minute canary on a production account; watch the error rate and rollback point.',
          steps: ['Run one real path.', 'Accept failure / rollback boundaries.'],
          risk: 'Auto-update skips confirmation; rollback untested.',
          short: 'Got it — the grayscale theme now matches the host palette.',
          tableHead: ['Check', 'Status', 'Notes'],
          tableRows: [['Tests', '✅ Pass', '127/127'], ['Release', '⚠ Pending', 'Waiting for the boss']],
        },
      },
    }

    let localeService = null
    let localeOverride = null
    const localeSubscribers = new Set()

    /** 语言标签归一化：zh* → zh，en* → en，其他已知语言 → en（未知语言回退英文）。 */
    const normalizeLocale = (tag) => {
      const value = typeof tag === 'string' ? tag.trim().toLowerCase() : ''
      if (!value) return ''
      if (value === 'zh' || value.startsWith('zh-') || value.startsWith('zh_')) return 'zh'
      if (value === 'en' || value.startsWith('en-') || value.startsWith('en_')) return 'en'
      return I18N_FALLBACK
    }

    /**
     * 当前语言探测顺序：测试覆盖 → DSH locale 服务快照 → <html lang> → navigator.language → en。
     * 非浏览器上下文（旧 vm 测试 / 预渲染）没有 navigator，沿用 1.2.x 中文基线。
     */
    const detectLocale = () => {
      if (localeOverride) return localeOverride
      try {
        const snapshot = localeService && typeof localeService.getSnapshot === 'function' ? localeService.getSnapshot() : null
        const active = normalizeLocale(snapshot && snapshot.active)
        if (active) return active
      } catch {}
      try {
        const root = typeof document !== 'undefined' ? document.documentElement : null
        const documentLang = root ? (typeof root.getAttribute === 'function' ? root.getAttribute('lang') : root.lang) : ''
        const fromDocument = normalizeLocale(documentLang)
        if (fromDocument) return fromDocument
      } catch {}
      try {
        if (typeof navigator !== 'undefined') {
          const tags = [navigator.language, ...(Array.isArray(navigator.languages) ? navigator.languages : [])]
          for (const tag of tags) {
            const resolved = normalizeLocale(tag)
            if (resolved) return resolved
          }
          return I18N_FALLBACK
        }
      } catch {}
      return 'zh'
    }

    const t = (key, params) => {
      const pair = I18N_TEXT[key]
      let text = pair ? pair[detectLocale() === 'zh' ? 0 : 1] : undefined
      if (text === undefined) text = pair ? pair[1] : String(key)
      if (params && typeof text === 'string') {
        text = text.replace(/\{(\w+)\}/g, (match, name) => (params[name] === undefined ? match : String(params[name])))
      }
      return text
    }

    const notifyLocale = () => {
      for (const listener of [...localeSubscribers]) {
        try { listener() } catch {}
      }
    }
    const subscribeLocale = (listener) => {
      localeSubscribers.add(listener)
      return () => { localeSubscribers.delete(listener) }
    }
    const setLocaleOverride = (value) => {
      localeOverride = value === null || value === undefined || value === '' ? null : normalizeLocale(value)
      notifyLocale()
      return detectLocale()
    }
    const setLocaleService = (service) => {
      localeService = service && typeof service.getSnapshot === 'function' ? service : null
      notifyLocale()
      return detectLocale()
    }
    /** 接住宿主 locale 服务：跟随 locale/change（快照修订也会触发）并保留用于渲染读取。 */
    const attachLocale = (service, scope) => {
      if (!service || typeof service.getSnapshot !== 'function') return
      const first = localeService !== service
      localeService = service
      // 首次接上服务时通知已挂载的卡片用服务快照重渲染（此前可能按 document/navigator 探测）。
      if (first) notifyLocale()
      if (!first || typeof service.subscribe !== 'function') return
      const unsubscribe = service.subscribe(() => notifyLocale())
      try { scope?.effect?.(() => unsubscribe, 'dsh-structured: locale') } catch {}
    }
    const paletteLabel = (key) => t('palette.' + key)
    const depthLabel = (value) => t('depth.' + (value === 'beginner' || value === 'expert' ? value : 'general'))
    const depthOptionsFor = () => DEPTH_OPTIONS.map((option) => ({
      value: option.value,
      label: t('depth.' + option.value),
      hint: t('depth.' + option.value + 'Hint'),
    }))
    const stylePresetLabel = (preset) => t('style.' + preset.id + '.label')
    const stylePresetPrompt = (preset) => t('style.' + preset.id + '.prompt')
    const stylePresetSample = (preset) => t('style.' + preset.id + '.sample')
    const stylePresetOs = (preset) => t('style.' + preset.id + '.os')
    /** 已保存的 style 文本可能来自任一语言预设，两种都认。 */
    const findStylePreset = (styleText) => STYLE_PRESETS.find((preset) => preset.style === styleText || stylePresetPrompt(preset) === styleText) || null
    const previewCopy = () => I18N_PREVIEW[detectLocale()] || I18N_PREVIEW[I18N_FALLBACK]
    const i18nTestApi = {
      t,
      detectLocale,
      normalizeLocale,
      setLocale: setLocaleOverride,
      setService: setLocaleService,
      textKeys: Object.keys(I18N_TEXT),
      preview: I18N_PREVIEW,
    }
    const DEFAULT_PALETTE = { primary: '#4B5563', secondary: '#047857', tertiary: '#B45309' }
    const PALETTE_MAX_BYTES = 4 * 1024

    const hasConfigField = (value, field) => {
      if (!value || typeof value !== 'object') return false
      if (Object.prototype.hasOwnProperty.call(value, field)) return true
      const raw = value[field]
      return Boolean(raw && typeof raw === 'object' && typeof raw.get === 'function')
    }
    const clampByte = (value) => Math.max(0, Math.min(255, Math.round(Number(value) || 0)))
    const clampPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0))
    const parseHexColor = (value) => {
      if (typeof value !== 'string') return null
      const text = value.trim().replace(/^#/, '')
      if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)) return null
      const full = text.length === 3 ? text.split('').map((ch) => ch + ch).join('') : text
      return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) }
    }
    const hexFromRgb = (rgb) => '#' + [rgb.r, rgb.g, rgb.b].map((channel) => clampByte(channel).toString(16).padStart(2, '0')).join('').toUpperCase()
    const normalizeHex = (value, fallback = '#000000') => {
      const rgb = parseHexColor(value)
      return rgb ? hexFromRgb(rgb) : fallback
    }
    const rgbToHsv = (rgb) => {
      const r = clampByte(rgb.r) / 255
      const g = clampByte(rgb.g) / 255
      const b = clampByte(rgb.b) / 255
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const delta = max - min
      let h = 0
      if (delta !== 0) {
        if (max === r) h = ((g - b) / delta) % 6
        else if (max === g) h = (b - r) / delta + 2
        else h = (r - g) / delta + 4
        h *= 60
        if (h < 0) h += 360
      }
      return { h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 }
    }
    const hsvToRgb = (h, s, v) => {
      const hue = ((Number(h) % 360) + 360) % 360
      const saturation = clampPercent(s) / 100
      const value = clampPercent(v) / 100
      const c = value * saturation
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
      const m = value - c
      let rgb = [0, 0, 0]
      if (hue < 60) rgb = [c, x, 0]
      else if (hue < 120) rgb = [x, c, 0]
      else if (hue < 180) rgb = [0, c, x]
      else if (hue < 240) rgb = [0, x, c]
      else if (hue < 300) rgb = [x, 0, c]
      else rgb = [c, 0, x]
      return { r: Math.round((rgb[0] + m) * 255), g: Math.round((rgb[1] + m) * 255), b: Math.round((rgb[2] + m) * 255) }
    }
    const colorLuminance = (hex) => {
      const rgb = parseHexColor(hex) ?? { r: 0, g: 0, b: 0 }
      const channel = (value) => {
        const unit = value / 255
        return unit <= 0.03928 ? unit / 12.92 : Math.pow((unit + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
    }
    const contrastRatio = (a, b) => {
      const l1 = colorLuminance(a)
      const l2 = colorLuminance(b)
      const light = Math.max(l1, l2)
      const dark = Math.min(l1, l2)
      return (light + 0.05) / (dark + 0.05)
    }
    const hueOf = (hex) => rgbToHsv(parseHexColor(hex) ?? { r: 0, g: 0, b: 0 }).h
    const hueDistance = (a, b) => {
      const delta = Math.abs(hueOf(a) - hueOf(b)) % 360
      return delta > 180 ? 360 - delta : delta
    }
    /** 软底饱和度上限 65%：任何选色都不会把正文泡在浓色里。 */
    const capSaturation = (hex, max = 65) => {
      const hsv = rgbToHsv(parseHexColor(hex) ?? { r: 0, g: 0, b: 0 })
      return hexFromRgb(hsvToRgb(hsv.h, Math.min(hsv.s, max), hsv.v))
    }
    /** 不满对比度时按明度双向找最近的可读色；找不到再退回黑/白。 */
    const ensureContrastColor = (hex, against = '#ffffff', min = 3) => {
      const rgb = parseHexColor(hex) ?? { r: 0, g: 0, b: 0 }
      const hsv = rgbToHsv(rgb)
      const direct = hexFromRgb(rgb)
      if (contrastRatio(direct, against) >= min) return direct
      for (let step = 1; step <= 100; step += 1) {
        const darker = hexFromRgb(hsvToRgb(hsv.h, hsv.s, Math.max(0, hsv.v - step)))
        if (contrastRatio(darker, against) >= min) return darker
        const lighter = hexFromRgb(hsvToRgb(hsv.h, hsv.s, Math.min(100, hsv.v + step)))
        if (contrastRatio(lighter, against) >= min) return lighter
      }
      return contrastRatio('#ffffff', against) >= contrastRatio('#000000', against) ? '#FFFFFF' : '#000000'
    }
    const paletteFromRaw = (raw) => {
      const palette = { ...DEFAULT_PALETTE }
      if (raw === undefined || raw === null || raw === '') return { ok: true, palette, error: '' }
      if (typeof raw === 'string' && raw.length > PALETTE_MAX_BYTES) return { ok: false, palette, error: t('palette.tooLarge') }
      let doc = raw
      if (typeof raw === 'string') {
        try { doc = JSON.parse(raw) } catch { return { ok: false, palette, error: t('palette.jsonInvalid') } }
      }
      if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { ok: false, palette, error: t('palette.notObject') }
      if (doc.schema !== undefined && doc.schema !== PALETTE_SCHEMA) return { ok: false, palette, error: t('palette.schema', { schema: PALETTE_SCHEMA }) }
      for (const key of PALETTE_KEYS) {
        if (doc[key] === undefined) continue
        const rgb = parseHexColor(doc[key])
        if (!rgb) return { ok: false, palette, error: t('palette.invalidHex', { label: paletteLabel(key), value: String(doc[key]) }) }
        palette[key] = hexFromRgb(rgb)
      }
      return { ok: true, palette, error: '' }
    }
    const paletteJson = (palette) => JSON.stringify({
      schema: PALETTE_SCHEMA,
      primary: normalizeHex(palette.primary, DEFAULT_PALETTE.primary),
      secondary: normalizeHex(palette.secondary, DEFAULT_PALETTE.secondary),
      tertiary: normalizeHex(palette.tertiary, DEFAULT_PALETTE.tertiary),
    })
    /** 保存前的自动修正：饱和度上限 65% + 纸面（浅色）对比度 ≥3。 */
    const autoFixPalette = (palette) => {
      const next = {}
      for (const key of PALETTE_KEYS) next[key] = ensureContrastColor(capSaturation(normalizeHex(palette[key], DEFAULT_PALETTE[key])), '#ffffff', 3)
      return next
    }
    const paletteValidation = (palette) => {
      const paper = '#ffffff'
      const contrast = PALETTE_KEYS.map((key) => {
        const ratio = contrastRatio(normalizeHex(palette[key], DEFAULT_PALETTE[key]), paper)
        return { key, paper, ratio, ok: ratio >= 3 }
      })
      const pairs = [['primary', 'secondary'], ['primary', 'tertiary'], ['secondary', 'tertiary']]
      const hue = pairs.map(([a, b]) => ({
        a,
        b,
        delta: hueDistance(normalizeHex(palette[a], DEFAULT_PALETTE[a]), normalizeHex(palette[b], DEFAULT_PALETTE[b])),
        ok: hueDistance(normalizeHex(palette[a], DEFAULT_PALETTE[a]), normalizeHex(palette[b], DEFAULT_PALETTE[b])) >= 25,
      }))
      return { ok: contrast.every((item) => item.ok), contrast, hue }
    }
    const colorMix = (hex, target, ratio) => {
      const a = parseHexColor(hex) ?? { r: 0, g: 0, b: 0 }
      const b = parseHexColor(target) ?? { r: 255, g: 255, b: 255 }
      const mix = (from, to) => Math.round(from + (to - from) * ratio)
      return hexFromRgb({ r: mix(a.r, b.r), g: mix(a.g, b.g), b: mix(a.b, b.b) })
    }
    const rgbaOf = (hex, alpha) => {
      const rgb = parseHexColor(hex) ?? { r: 0, g: 0, b: 0 }
      return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')'
    }
    const paletteTokensCss = (palette, dark) => {
      const primary = dark ? colorMix(palette.primary, '#FFFFFF', 0.3) : palette.primary
      const secondary = dark ? colorMix(palette.secondary, '#FFFFFF', 0.32) : palette.secondary
      const tertiary = dark ? colorMix(palette.tertiary, '#FFFFFF', 0.34) : palette.tertiary
      const hover = dark ? colorMix(primary, '#FFFFFF', 0.16) : colorMix(primary, '#000000', 0.12)
      // 讲解卡跟随自定义三色：取主色 / 副色中点，再按纸面校正对比度（深色模式下同样可读）。
      const paper = dark ? '#242629' : '#FFFFFF'
      const explain = ensureContrastColor(colorMix(primary, secondary, 0.5), paper, 4.5)
      const explainText = ensureContrastColor(colorMix(explain, dark ? '#FFFFFF' : '#000000', dark ? 0.34 : 0.18), paper, 4.5)
      return [
        '--dss-blue:' + primary + ';--dss-blue-hover:' + hover + ';--dss-blue-text:' + primary + ';--dss-th-text:' + primary + ';--dss-blue-soft:' + rgbaOf(primary, dark ? 0.2 : 0.12) + ';',
        '--dss-green:' + secondary + ';--dss-green-strong:' + secondary + ';--dss-green-text:' + secondary + ';--dss-green-soft:' + rgbaOf(secondary, dark ? 0.18 : 0.12) + ';',
        '--dss-amber:' + tertiary + ';--dss-amber-strong:' + tertiary + ';--dss-amber-text:' + tertiary + ';--dss-amber-soft:' + rgbaOf(tertiary, dark ? 0.16 : 0.12) + ';',
        '--dss-explain:' + explain + ';--dss-explain-text:' + explainText + ';--dss-explain-soft:' + rgbaOf(explain, dark ? 0.2 : 0.1) + ';--dss-explain-line:' + rgbaOf(explain, dark ? 0.28 : 0.18) + ';',
        '--dss-head-bg:linear-gradient(90deg,' + rgbaOf(primary, dark ? 0.26 : 0.18) + ',' + rgbaOf(primary, dark ? 0.07 : 0.05) + ');',
      ].join('')
    }
    const customThemeCss = (palette) => [
      'body[' + THEME_ATTR + '="' + CUSTOM_THEME + '"] .dss-scope{' + paletteTokensCss(palette, false) + '}',
      'body[data-ds-dark-theme][' + THEME_ATTR + '="' + CUSTOM_THEME + '"] .dss-scope{' + paletteTokensCss(palette, true) + '}',
    ].join('\n')

    /**
     * 配置页专用样式：主题分段选择器的三个选项各带自己所代表主题的强调色
     * （圆点标识 + 选中态文字着色，明暗自适应）。色值与视觉层三套 token 同源，
     * 但作用域是设置面板（不在 _markdown_ 容器内），所以单独一份而不是复用 --ds-*。
     */
    const CONFIG_STYLE_ID = 'dsh-structured-config-style'
    const CONFIG_CSS = `
.dss-scope {
  --dss-page:#f7f8fa;--dss-paper:#ffffff;--dss-paper-2:#f8fafc;
  --dss-ink:#101828;--dss-ink-2:#475467;--dss-ink-3:#667085;
  --dss-line:#e4e7ec;--dss-line-strong:#d0d5dd;
  --dss-blue:#2563eb;--dss-blue-hover:#1d4ed8;--dss-blue-text:#1d4ed8;--dss-th-text:#115e59;--dss-blue-soft:#eff6ff;
  --dss-green:#067647;--dss-green-strong:#059669;--dss-green-text:#047857;--dss-green-soft:#f0faf4;
  --dss-amber:#b54708;--dss-amber-strong:#d97706;--dss-amber-text:#b54708;--dss-amber-soft:#fffbf3;
  --dss-explain:#7c3aed;--dss-explain-text:#6d28d9;--dss-explain-soft:#f5f3ff;--dss-explain-line:#ede9fe;
  --dss-red:#b42318;--dss-red-soft:#fef3f2;
  --dss-head-bg:linear-gradient(90deg,rgba(37,99,235,.18),rgba(37,99,235,.05));--dss-zebra:rgba(255,255,255,.55);
  --dss-code-bg:rgba(255,255,255,.72);--dss-code-border:#dbe7ff;--dss-code-text:#344054;
  --dss-shadow:0 1px 3px rgba(16,24,40,.05);
  --dss-sans:var(--dsh-font-family-text,system-ui,-apple-system,"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif);
  --dss-mono:var(--dsh-font-family-code,ui-monospace,Consolas,"SFMono-Regular",monospace);
  --dss-serif:var(--dsh-font-family-text,Georgia,"Times New Roman","Noto Serif SC","SimSun",serif);
  --dss-text-size:var(--dsh-content-font-size,13.5px);
  --dss-code-size:var(--dsh-code-font-size,12.5px);
}
body[data-ds-dark-theme] .dss-scope {
  --dss-page:#1a1b1e;--dss-paper:#242629;--dss-paper-2:#2b2e33;
  --dss-ink:#e6e9ef;--dss-ink-2:#b7bdc9;--dss-ink-3:#8a92a0;
  --dss-line:#363a41;--dss-line-strong:#4a4f59;
  --dss-blue:#3b82f6;--dss-blue-hover:#60a5fa;--dss-blue-text:#8ab4ff;--dss-th-text:#5eead4;--dss-blue-soft:rgba(59,130,246,.16);
  --dss-green:#34d399;--dss-green-strong:#10b981;--dss-green-text:#34d399;--dss-green-soft:rgba(16,185,129,.14);
  --dss-amber:#fbbf24;--dss-amber-strong:#f59e0b;--dss-amber-text:#fbbf24;--dss-amber-soft:rgba(245,158,11,.12);
  --dss-explain:#a78bfa;--dss-explain-text:#c4b5fd;--dss-explain-soft:rgba(124,58,237,.18);--dss-explain-line:rgba(167,139,250,.25);
  --dss-red:#f87171;--dss-red-soft:rgba(248,113,113,.16);
  --dss-head-bg:linear-gradient(90deg,rgba(96,165,250,.24),rgba(96,165,250,.06));--dss-zebra:rgba(255,255,255,.03);
  --dss-code-bg:rgba(0,0,0,.28);--dss-code-border:rgba(96,165,250,.28);--dss-code-text:#c9d2e0;
  --dss-shadow:0 1px 3px rgba(0,0,0,.35);
}


.dss-scope .dss-card {
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 90%);
  box-shadow:var(--dss-shadow);color:var(--dss-ink-2);
}
.dss-scope .dss-card > p:first-child{margin-top:0}
.dss-scope .dss-card > p:last-child{margin-bottom:0}
.dss-scope .dss-card-conclusion,.dss-scope .dss-card-accept{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 90%);
}
.dss-scope .dss-card-next{
  border-left-color:var(--dss-green-strong);
  background:linear-gradient(180deg,var(--dss-green-soft),var(--dss-paper) 90%);
}
.dss-scope .dss-card-risk{
  border-left-color:var(--dss-amber-strong);
  background:linear-gradient(180deg,var(--dss-amber-soft),var(--dss-paper) 90%);
}
.dss-scope .dss-card-statement{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 90%);
}
.dss-scope .dss-card-short{
  border-left-color:var(--dss-blue);background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 90%);box-shadow:none;
}
.dss-scope .dss-card-short > p:first-child > strong:first-child:not([data-dss-inline]){
  display:block;width:100%;margin:0 0 8px;padding:0 0 6px;border-bottom:1px solid var(--dss-line);
  font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;color:var(--dss-blue-text);
}
.dss-scope .dss-card-short > p{font-size:13.5px;line-height:1.7;color:var(--dss-ink-2)}
.dss-scope .dss-card-explain{border-left-color:var(--dss-explain);background:linear-gradient(90deg,var(--dss-explain-soft),var(--dss-paper) 78%);box-shadow:none}
.dss-scope .dss-card-explain > p:first-child > strong:first-child{
  display:block;width:100%;margin:0 0 8px;padding:0 0 6px;border-bottom:1px solid var(--dss-explain-line);
  font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;color:var(--dss-explain-text);
}
.dss-scope .dss-card-explain > p{font-size:13.5px;line-height:1.7;color:var(--dss-ink-2)}
.dss-scope .dss-card-explain > p > strong:first-child{color:var(--dss-explain);font-weight:700}
.dss-scope .dss-card-conclusion > p:first-child > strong:first-child,
.dss-scope .dss-card-accept > p:first-child > strong:first-child,
.dss-scope .dss-card-next > p:first-child > strong:first-child,
.dss-scope .dss-card-risk > p:first-child > strong:first-child{
  display:block;width:100%;margin:0 0 10px;padding:0 0 7px;
  border-bottom:1px solid var(--dss-line);
  font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;
  color:var(--dss-blue-text);
}
.dss-scope .dss-card-next > p:first-child > strong:first-child{color:var(--dss-green-text)}
.dss-scope .dss-card-risk > p:first-child > strong:first-child{color:var(--dss-amber-text)}
.dss-scope .dss-card-conclusion > p,.dss-scope .dss-card-accept > p,
.dss-scope .dss-card-next > p,.dss-scope .dss-card-risk > p{
  margin:.45em 0;font-size:13.5px;line-height:1.7;color:var(--dss-ink-2);
}
.dss-scope .dss-card-conclusion > p:not(:first-child) > strong:first-child:not([data-dss-inline]),
.dss-scope .dss-card-accept > p:not(:first-child) > strong:first-child:not([data-dss-inline]){
  display:block;margin:0 0 6px;padding:0;border:0;
  font:700 19px/1.45 var(--dss-serif);letter-spacing:.01em;color:var(--dss-ink);
}
.dss-scope .dss-card-conclusion > p strong,.dss-scope .dss-card-accept > p strong,
.dss-scope .dss-card-next > p strong,.dss-scope .dss-card-risk > p strong{color:var(--dss-ink);font-weight:700}
.dss-scope .dss-card-statement > p:first-child > strong:first-child:not([data-dss-inline]){
  display:block;margin:0 0 6px;padding:0;border:0;
  font:700 19px/1.45 var(--dss-serif);letter-spacing:.01em;color:var(--dss-ink);
}
.dss-scope .dss-card-statement > p{font-size:13.5px;line-height:1.7;color:var(--dss-ink-2)}
.dss-scope .dss-card-next ol{padding:0;margin:2px 0 0;list-style:none;counter-reset:dss-step}
.dss-scope .dss-card-next li{
  position:relative;margin:8px 0;padding:2px 0 0 30px;font-size:13.5px;line-height:1.7;
  color:var(--dss-ink-2);counter-increment:dss-step;
}
.dss-scope .dss-card-next li::before{
  content:counter(dss-step,decimal);position:absolute;left:0;top:2px;
  display:grid;place-items:center;width:22px;height:22px;border-radius:50%;
  background:var(--dss-green-soft);color:var(--dss-green-text);font:600 11px/1 var(--dss-mono);
}
.dss-scope .dss-card-risk p{color:var(--dss-ink-2)}
.dss-scope .dss-card-conclusion ol.dss-points{padding:0;margin:2px 0 0;list-style:none;counter-reset:dss-point}
.dss-scope .dss-card-conclusion ol.dss-points li{
  position:relative;margin:8px 0;padding:2px 0 0 30px;font-size:var(--dss-text-size);line-height:1.7;
  color:var(--dss-ink-2);counter-increment:dss-point;
}
.dss-scope .dss-card-conclusion ol.dss-points li::before{
  content:counter(dss-point,upper-alpha);position:absolute;left:0;top:2px;
  display:grid;place-items:center;width:22px;height:22px;border-radius:50%;
  background:var(--dss-blue-soft);color:var(--dss-blue-text);font:600 var(--dss-code-size,11px)/1 var(--dss-mono);
}
.dss-scope .dss-table tbody td[data-dss-row-index]::before{content:attr(data-dss-row-index);display:inline-block;min-width:1.1em;margin-right:6px;color:var(--dss-ink-3);font:600 calc(var(--dss-text-size) * 11 / 13.5)/1 var(--dss-mono);text-align:right;vertical-align:0}
.dss-scope .dss-table{
  width:100%;margin:14px 0;border:1px solid var(--dss-line);border-left:3px solid var(--dss-blue);
  border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;
  background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 62%);
  box-shadow:var(--dss-shadow);font-size:13px;color:var(--dss-ink-2);
}
.dss-scope .dss-table thead th{
  height:auto;padding:10px 16px!important;background:var(--dss-head-bg)!important;border-bottom:0;
  color:var(--dss-th-text)!important;font:600 11.5px/1.5 var(--dss-sans)!important;letter-spacing:.08em!important;text-align:left;overflow-wrap:anywhere;
}
.dss-scope .dss-table th[data-dsh-structured-col="narrow"],.dss-scope .dss-table td[data-dsh-structured-col="narrow"]{width:1%;white-space:nowrap;min-width:0}
.dss-scope .dss-table[data-dsh-structured-tail="capped"] th:last-child,.dss-scope .dss-table[data-dsh-structured-tail="capped"] td:last-child{width:32%}
.dss-scope .dss-table tbody td{
  padding:11px 16px!important;border-bottom:1px solid var(--dss-line)!important;background:transparent;
  color:var(--dss-ink-2)!important;font-size:13px!important;line-height:1.55!important;vertical-align:middle;overflow-wrap:anywhere;
}
.dss-scope .dss-table tbody td:first-child{color:var(--dss-ink)!important;font-weight:600!important;font-size:13.5px!important}
.dss-scope .dss-table tbody tr:nth-child(even){background:var(--dss-zebra)}
.dss-scope .dss-table tbody tr:last-child td{border-bottom:0}
.dss-scope .dss-table td[data-dsh-structured-status-cell]{white-space:nowrap}
.dss-scope .dss-table tbody td[data-dsh-structured-status-cell="success"]{background:var(--dss-green-soft);box-shadow:inset 3px 0 0 var(--dss-green)}
.dss-scope .dss-table tbody td[data-dsh-structured-status-cell="warn"]{background:var(--dss-amber-soft);box-shadow:inset 3px 0 0 var(--dss-amber)}
.dss-scope .dss-table tbody td[data-dsh-structured-status-cell="error"]{background:var(--dss-red-soft);box-shadow:inset 3px 0 0 var(--dss-red)}
.dss-scope .dss-code{
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 62%);
  box-shadow:var(--dss-shadow);
}
.dss-scope .dss-code > [class*="_bannerWrap"]{margin:0;padding:0;border:0;background:none;position:static;z-index:auto}
.dss-scope [class*="_fenceSeat"]:has(> .dss-code){margin:0}
.dss-scope .dss-code [data-code-block-banner]{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin:0 0 10px;padding:2px 0 7px!important;border:0;border-bottom:1px solid var(--dss-line);
  border-radius:0;background:transparent!important;color:var(--dss-blue-text)!important;
  font:700 12px/1.5 var(--dss-sans)!important;letter-spacing:.04em;text-transform:none;
}
.dss-scope .dss-code [data-code-block-banner]::before{
  content:none;flex:none;color:var(--dss-blue-text);
}
.dss-scope .dss-code[data-dsh-structured-lang] [data-code-block-banner]::before{
  content:"代码 · ";
}
.dss-scope .dss-code [data-code-block-banner] > [class*="_heading"]{
  flex:1;min-width:0;justify-content:flex-start;text-align:left;color:inherit;
}
.dss-scope .dss-code [data-code-block-banner] > [class*="_actions"]{margin-left:auto;flex:none}
.dss-scope .dss-code > [data-code-block-content]{padding:0}
.dss-scope .dss-code pre{
  margin:0;padding:12px 14px;border:1px solid var(--dss-code-border);border-radius:8px;
  background:var(--dss-code-bg)!important;color:var(--dss-code-text)!important;
  font:12.5px/1.7 var(--dss-mono)!important;overflow:auto;
}
.dss-scope .dss-copy{
  display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:5px;
  background:transparent;color:var(--dss-ink-3);cursor:pointer;
}
.dss-scope .dss-copy:hover{background:var(--dss-paper-2);color:var(--dss-ink)}
.dss-scope .dss-copy-icon{position:relative;display:inline-block;width:13px;height:13px}
.dss-scope .dss-copy-icon::before{content:"";position:absolute;inset:0 3px 3px 0;border:1.5px solid currentColor;border-radius:2px}
.dss-scope .dss-copy-icon::after{content:"";position:absolute;inset:3px 0 0 3px;border:1.5px solid currentColor;border-radius:2px}
.dss-scope .dss-copy-ok{display:none;font:700 12px/1 var(--dss-mono)}
.dss-scope .dss-copy[data-copied="1"] .dss-copy-icon{display:none}
.dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{display:inline;color:var(--dss-green)}




body[data-ds-dark-theme] .dss-scope .dss-card-short > p:first-child > strong:first-child:not([data-dss-inline]){color:var(--dss-blue-text)}


.dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{color:var(--dss-green)}
.dss-scope .dss-persona-head{padding:0 0 10px}
.dss-scope .dss-persona-head .dss-chat-head{display:flex;align-items:center;gap:12px;padding:0}
.dss-scope .dss-persona-head .dss-chat-avatar{position:relative;display:grid;place-items:center;width:38px;height:38px;flex:none;overflow:hidden;border-radius:50%;background:var(--dss-blue-soft);box-shadow:0 0 0 3px var(--dss-page),0 2px 10px rgba(16,24,40,.18)}
.dss-scope .dss-persona-head .dss-chat-avatar img{width:100%;height:100%;object-fit:cover}
.dss-scope .dss-persona-head .dss-chat-id{min-width:0}
.dss-scope .dss-persona-head .dss-chat-name{display:block;color:var(--dss-ink);font-size:16px;font-weight:650;line-height:1.3}
.dss-scope .dss-persona-head .dss-chat-meta{display:block;color:var(--dss-ink-3);font:12px/1.5 var(--dss-mono);overflow-wrap:anywhere}
.dss-scope .dss-persona-prefix{margin:0;color:var(--dss-ink-3);font:12.5px/1.7 var(--dss-mono)}
.dss-scope .dss-persona-suffix{margin:0;padding-top:8px;border-top:1px dotted var(--dss-line-strong);color:var(--dss-ink-3);font:12px/1.65 var(--dss-mono);overflow-wrap:anywhere}

.dss-scope.dss-config{width:100%;max-width:100%;color:var(--dss-ink);font:13px/1.55 var(--dss-sans)}
.dss-config *{box-sizing:border-box}
.dss-hidden{display:none!important}
.dss-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:10px}
.dss-section-title{margin:0;color:var(--dss-ink);font:600 16px/1.4 var(--dss-sans)}
.dss-note{margin:0 0 16px;color:var(--dss-ink-3);font-size:12px;line-height:1.65}
.dss-profile{display:flex;align-items:center;gap:16px;margin:2px 0 18px;padding:0}
.dss-profile-avatar{display:grid;place-items:center;width:88px;height:88px;flex:none;overflow:hidden;border:0;border-radius:50%;background:var(--dss-blue-soft);box-shadow:0 0 0 3px var(--dss-page),0 2px 10px rgba(16,24,40,.12);cursor:pointer;transition:box-shadow .14s}
.dss-profile-avatar:hover{box-shadow:0 0 0 3px var(--dss-page),0 2px 10px rgba(16,24,40,.12),0 0 0 6px rgba(37,99,235,.18)}
.dss-profile-avatar img{width:100%;height:100%;object-fit:cover}
.dss-profile-info{min-width:0;flex:1}
.dss-profile-name{display:block;width:100%;max-width:320px;height:30px;padding:0;border:0;border-bottom:1px solid transparent;border-radius:0;background:transparent;color:var(--dss-ink);font:600 19px/1.3 var(--dss-sans);letter-spacing:-.01em;outline:0}
.dss-profile-name:hover{border-bottom-color:var(--dss-line-strong)}
.dss-profile-name:focus{border-bottom-color:var(--dss-blue)}
.dss-profile-sig{display:block;width:100%;max-width:380px;height:24px;margin-top:2px;padding:0;border:0;border-bottom:1px solid transparent;border-radius:0;background:transparent;color:var(--dss-ink-3);font:12px/1.6 var(--dss-mono);outline:0}
.dss-profile-sig:hover{border-bottom-color:var(--dss-line)}
.dss-profile-sig:focus{border-bottom-color:var(--dss-blue);color:var(--dss-ink-2)}
.dss-source{position:relative;display:flex;align-items:center;gap:6px;min-width:0;flex:none;margin-left:auto}
.dss-source-btn{display:inline-flex;align-items:center;gap:6px;max-width:240px;height:30px;padding:0 10px;border:1px solid #bfd3ff;border-radius:6px;background:var(--dss-blue-soft);color:var(--dss-blue);font-size:12.5px;font-weight:500;cursor:pointer}
.dss-source-btn:hover{border-color:var(--dss-blue);background:#e3edff}
.dss-caret{width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-top:4px solid var(--dss-ink-3)}
.dss-popover{position:absolute;top:34px;right:0;z-index:30;width:264px;padding:6px;border:1px solid var(--dss-line-strong);border-radius:8px;background:var(--dss-paper);box-shadow:0 12px 32px rgba(16,24,40,.12)}
.dss-template-list{display:grid;gap:2px}
.dss-template-row{position:relative}
.dss-template-option{display:flex;gap:9px;align-items:center;width:100%;min-height:44px;padding:7px 40px 7px 8px;border:0;border-radius:6px;background:transparent;text-align:left;cursor:pointer;color:var(--dss-ink)}
.dss-template-option:hover{background:var(--dss-paper-2)}
.dss-template-option[aria-checked="true"]{background:var(--dss-blue-soft)}
.dss-template-option .mark{display:grid;place-items:center;width:24px;height:24px;flex:none;border-radius:50%;background:var(--dss-paper-2);border:1px solid var(--dss-line);color:var(--dss-ink-2);font-size:11px}
.dss-template-option[aria-checked="true"] .mark{border-color:#bfd3ff;background:var(--dss-paper);color:var(--dss-blue)}
.dss-template-option strong{display:block;font-size:12.5px;font-weight:500}
.dss-template-option em{display:block;margin-top:1px;color:var(--dss-ink-3);font-size:11px;font-style:normal}
.dss-template-del{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:26px;height:26px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dss-ink-3);font-size:15px;line-height:1;opacity:.5;cursor:pointer}
.dss-template-row:hover .dss-template-del{opacity:1}
.dss-template-del:hover{background:var(--dss-red-soft);color:var(--dss-red)}
.dss-template-empty{padding:10px 8px;color:var(--dss-ink-3);font-size:11.5px}
.dss-template-foot{margin-top:4px;padding:6px 4px 2px;border-top:1px solid var(--dss-line)}
.dss-template-save{display:block;width:100%;padding:8px;border:0;border-radius:6px;background:transparent;color:var(--dss-blue);font-size:12px;text-align:left;cursor:pointer}
.dss-template-save:hover{background:var(--dss-blue-soft)}
.dss-field{margin-bottom:14px}
.dss-field-label{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:6px}
.dss-field-label label{font-size:13px;font-weight:600;color:var(--dss-ink)}
.dss-hint{color:var(--dss-ink-3);font-size:11.5px}
.dss-input,.dss-textarea{display:block;width:100%;padding:7px 10px;border:1px solid var(--dss-line-strong);border-radius:6px;background:var(--dss-paper);color:var(--dss-ink);font:13px/1.6 var(--dss-sans);outline:0;transition:border-color .14s,box-shadow .14s}
.dss-input:focus,.dss-textarea:focus{border-color:var(--dss-blue);box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.dss-textarea{min-height:40px;resize:none}
.dss-control .dss-textarea{padding-right:38px}
.dss-control{position:relative}
.dss-control .dss-input{padding-right:38px}
.dss-icon-btn{position:absolute;right:6px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:26px;height:26px;padding:0;border:1px solid var(--dss-line);border-radius:5px;background:var(--dss-paper-2);color:var(--dss-ink-2);font-size:14px;cursor:pointer}
.dss-icon-btn:hover{border-color:#bfd3ff;background:var(--dss-blue-soft)}
.dss-emoji-panel{display:none;position:absolute;top:calc(100% + 4px);right:0;z-index:20;width:232px;grid-template-columns:repeat(8,1fr);gap:1px;padding:6px;border:1px solid var(--dss-line-strong);border-radius:6px;background:var(--dss-paper);box-shadow:0 12px 28px rgba(16,24,40,.12)}
.dss-emoji-panel.is-open{display:grid}
.dss-emoji-panel button{display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:4px;background:transparent;font-size:15px;cursor:pointer}
.dss-emoji-panel button:hover{background:var(--dss-blue-soft)}
.dss-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dss-field-meta{display:flex;justify-content:flex-end;margin-top:4px;min-height:14px}
.dss-counter{color:var(--dss-ink-3);font:10.5px/1.4 var(--dss-mono)}
.dss-rules{margin:14px 0 0;color:var(--dss-ink-3);font-size:11.5px;line-height:1.65}
.dss-known-limit{margin:8px 0 0;color:var(--dss-ink-3);font-size:11.5px;line-height:1.65}
.dss-save{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:4px}
.dss-save-state{color:var(--dss-ink-3);font-size:12px;line-height:1.5}
.dss-save-state.is-error{color:var(--dss-red)}
.dss-save-actions{display:flex;gap:10px}
.dss-btn{height:34px;padding:0 14px;border:1px solid var(--dss-line-strong);border-radius:6px;background:var(--dss-paper);color:var(--dss-ink-2);font-size:12.5px;white-space:nowrap;cursor:pointer}
.dss-btn:hover{background:var(--dss-paper-2)}
.dss-btn:disabled{opacity:.5;cursor:default}
.dss-btn-primary{border-color:var(--dss-blue);background:var(--dss-blue);color:#fff;font-weight:500}
.dss-btn-primary:hover{background:var(--dss-blue-hover)}
.dss-preview{margin-top:30px;border-top:1px solid var(--dss-line)}
.dss-preview-head{display:block}
.dss-preview-title-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-height:40px}
.dss-preview-title{margin:0;color:var(--dss-ink);font:600 16px/1.4 var(--dss-sans)}
.dss-preview-note{color:var(--dss-ink-3);font-size:11.5px;line-height:1.5;font-weight:400}
.dss-preview-tabs-row{display:flex;align-items:center;gap:10px;padding:4px 0 10px}
.dss-preview-tabs{display:flex;gap:2px;padding:2px;border:1px solid var(--dss-line);border-radius:6px;background:var(--dss-paper-2)}
.dss-preview-tab{height:26px;padding:0 10px;border:0;border-radius:4px;background:transparent;color:var(--dss-ink-2);font-size:11.5px;cursor:pointer}
.dss-preview-tab[aria-selected="true"]{background:var(--dss-paper);color:var(--dss-ink);font-weight:500;box-shadow:0 1px 2px rgba(16,24,40,.06)}
.dss-chat-card{padding:14px 4px 6px}
.dss-chat-card.is-off .dss-chat-body{filter:grayscale(.92);opacity:.7}
.dss-chat-head{display:flex;align-items:center;gap:12px;padding:0 0 10px}
.dss-chat-avatar{position:relative;display:grid;place-items:center;width:38px;height:38px;flex:none;overflow:hidden;border-radius:50%;background:var(--dss-blue-soft);box-shadow:0 0 0 3px var(--dss-page),0 2px 10px rgba(16,24,40,.18)}
.dss-chat-avatar img{width:100%;height:100%;object-fit:cover}
.dss-chat-id{min-width:0}
.dss-chat-name{display:block;color:var(--dss-ink);font-size:16px;font-weight:650;line-height:1.3}
.dss-chat-meta{display:block;color:var(--dss-ink-3);font:12px/1.5 var(--dss-mono);overflow-wrap:anywhere}
.dss-chat-body{display:grid;gap:12px;padding:6px 0 0 50px}
.dss-msg-prefix{margin:0;color:var(--dss-ink-3);font:12.5px/1.7 var(--dss-mono)}
.dss-msg-structure{display:grid;gap:12px;min-width:0}
.dss-msg-suffix{margin:0;padding-top:8px;border-top:1px dotted var(--dss-line-strong);color:var(--dss-ink-3);font:12px/1.65 var(--dss-mono);overflow-wrap:anywhere}
.dss-msg-lead{margin:0;color:var(--dss-ink-2);font-size:13.5px;line-height:1.7}
.dss-line-title{display:flex;align-items:center;width:100%;margin:0 0 10px;padding:0 0 7px;border-bottom:1px solid var(--dss-line);font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;color:var(--dss-blue-text)}
.dss-card-next .dss-line-title{color:var(--dss-green-text)}
.dss-card-risk .dss-line-title{color:var(--dss-amber-text)}
.dss-msg-title{margin:0;color:var(--dss-ink);font:700 19px/1.45 var(--dss-serif);letter-spacing:.01em;overflow-wrap:anywhere}
.dss-msg-sub{margin:6px 0 0;color:var(--dss-ink-2);font-size:13.5px;line-height:1.7;overflow-wrap:anywhere}
.dss-msg-steps{display:grid;gap:8px;margin:2px 0 0;padding:0;list-style:none}
.dss-msg-steps li{display:grid;grid-template-columns:26px minmax(0,1fr);gap:8px;align-items:start}
.dss-msg-num{display:grid;place-items:center;width:22px;height:22px;padding-top:0;border-radius:50%;background:var(--dss-green-soft);color:var(--dss-green-text);font:600 11px/1.6 var(--dss-mono);font-variant-numeric:tabular-nums}
.dss-msg-step,.dss-msg-risk-text{margin:0;color:var(--dss-ink-2);font-size:13.5px;line-height:1.7;overflow-wrap:anywhere}
.dss-pane-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;padding:2px 0 7px;border-bottom:1px solid var(--dss-line);font:700 12px/1.5 var(--dss-sans);letter-spacing:.04em;color:var(--dss-blue-text)}
.dss-code-body{margin:0;padding:12px 14px;border:1px solid var(--dss-code-border);border-radius:8px;background:var(--dss-code-bg);color:var(--dss-code-text);font:12.5px/1.7 var(--dss-mono);overflow:auto}
body[data-ds-dark-theme] .dss-scope .dss-msg-num{background:rgba(52,211,153,.16);color:#34d399}
body[data-ds-dark-theme] .dss-scope .dss-source-btn{border-color:rgba(96,165,250,.4)}
body[data-ds-dark-theme] .dss-scope .dss-source-btn:hover{background:rgba(59,130,246,.22)}
body[data-ds-dark-theme] .dss-scope .dss-template-option[aria-checked="true"] .mark{border-color:rgba(96,165,250,.4)}
[data-dsh-structured-config] button[id^="dsh-structured-theme-"]{position:relative}
[data-dsh-structured-config] button[id^="dsh-structured-theme-"]::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:7px;vertical-align:baseline;background:var(--dsw-alias-label-tertiary,#9CA3AF)}
[data-dsh-structured-config] button#dsh-structured-theme-deepseek::before{background:#2563EB}
[data-dsh-structured-config] button#dsh-structured-theme-codex::before{background:#10A37F}
[data-dsh-structured-config] button#dsh-structured-theme-anthropic::before{background:#CC785C}
[data-dsh-structured-config] button#dsh-structured-theme-dsh::before{background:#6B7280}
[data-dsh-structured-config] button#dsh-structured-theme-deepseek[aria-selected="true"]{color:#2563EB;font-weight:600}
[data-dsh-structured-config] button#dsh-structured-theme-codex[aria-selected="true"]{color:#0B6B4F;font-weight:600}
[data-dsh-structured-config] button#dsh-structured-theme-anthropic[aria-selected="true"]{color:#A14A2E;font-weight:600}
[data-dsh-structured-config] button#dsh-structured-theme-dsh[aria-selected="true"]{color:#374151;font-weight:600}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-deepseek::before{background:#60A5FA}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-codex::before{background:#34D399}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-anthropic::before{background:#E8A087}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-dsh::before{background:#D1D5DB}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-deepseek[aria-selected="true"]{color:#60A5FA}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-codex[aria-selected="true"]{color:#34D399}
body[data-ds-dark-theme] [data-dsh-structured-config] button#dsh-structured-theme-anthropic[aria-selected="true"]{color:#E8A087}
/* 1.2.0 单页设置：标题行 / 状态行 / 外观 / 人格 / 深度 / 预览 */
.dss-config-page{width:100%;max-width:960px;margin:0 auto;min-width:0;height:100%;overflow-y:auto;overflow-x:hidden;box-sizing:border-box;padding:40px 24px 48px}
.dss-page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:2px 0 16px}
@media (max-width: 720px){.dss-page-head{flex-wrap:wrap}.dss-preview-grid{grid-template-columns:1fr}.dss-depth-tiles{grid-template-columns:1fr}.dss-cp-preview{grid-template-columns:1fr}}
.dss-eyebrow{font-size:11px;letter-spacing:.14em;color:var(--dss-ink-3)}
.dss-page-title{margin:6px 0 4px;color:var(--dss-ink);font:600 24px/1.25 var(--dss-sans);letter-spacing:-.01em}
.dss-page-sub{margin:0 0 10px;color:var(--dss-ink-3);font-size:13px}
.dss-status-line{display:inline-flex;align-items:center;gap:7px;padding:4px 11px;border:1px solid var(--dss-line);border-radius:999px;background:var(--dss-paper);color:var(--dss-ink-2);font-size:12px}
.dss-status-dot{width:7px;height:7px;flex:none;border-radius:50%;background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.14)}
.dss-status-dot.is-off{background:var(--dss-ink-3);box-shadow:none}
.dss-page-section{padding:20px 0 10px;border-top:1px solid var(--dss-line)}
.dss-section-desc{margin:2px 0 14px;color:var(--dss-ink-3);font-size:12.5px;line-height:1.6}
.dss-chip{display:inline-block;margin-left:8px;padding:1px 8px;border:1px solid var(--dss-line-strong);border-radius:999px;color:var(--dss-ink-3);font-size:11px;font-weight:400;line-height:1.5}
.dss-chip.is-ok{border-color:#bbf7d0;background:#f0fdf4;color:#067647}
body[data-ds-dark-theme] .dss-chip.is-ok{border-color:rgba(52,211,153,.4);background:rgba(16,185,129,.14);color:#6ee7b7}
.dss-theme-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.dss-theme-tile{display:flex;flex-direction:column;align-items:flex-start;gap:7px;padding:9px;border:1px solid var(--dss-line);border-radius:9px;background:var(--dss-paper);text-align:left;cursor:pointer}
.dss-theme-tile:hover{border-color:var(--dss-line-strong)}
.dss-theme-tile.is-selected{border-color:var(--dss-ink);box-shadow:0 0 0 1px var(--dss-ink) inset}
.dss-theme-tile:disabled{cursor:default;opacity:.65}
.dss-theme-mini{display:block;width:100%;height:34px;border:1px solid var(--dss-line);border-left:3px solid var(--dss-blue);border-radius:6px;background:var(--dss-paper-2)}
.dss-theme-name{display:flex;align-items:center;gap:6px;color:var(--dss-ink);font-size:12.5px;font-weight:600}
.dss-theme-name em{color:#067647;font-size:11px;font-style:normal;font-weight:500}
.dss-colors{display:flex;align-items:center;gap:18px;margin:14px 0 4px;flex-wrap:wrap}
.dss-color-item{display:flex;align-items:center;gap:8px;color:var(--dss-ink-2);font-size:12.5px}
.dss-color-swatch{width:32px;height:32px;padding:0;border:1px solid var(--dss-line-strong);border-radius:8px;cursor:pointer}
.dss-color-swatch:focus-visible{outline:2px solid var(--dss-blue);outline-offset:2px}
.dss-link-btn{margin-left:auto;padding:0;border:0;background:transparent;color:var(--dss-ink-3);font-size:12px;cursor:pointer}
.dss-link-btn:hover{color:var(--dss-blue)}
.dss-color-pop{position:relative;width:390px;max-width:100%;margin:12px 0 0;padding:14px;border:1px solid var(--dss-line);border-radius:12px;background:var(--dss-paper);box-shadow:0 12px 28px rgba(16,24,40,.12)}
.dss-cp-head{display:flex;align-items:center;gap:8px;color:var(--dss-ink-2);font-size:12.5px}
.dss-cp-head b{color:var(--dss-ink);font-size:13px}
.dss-cp-head .dss-link-btn{margin-left:auto}
.dss-sv{position:relative;height:150px;margin-top:10px;border:1px solid var(--dss-line);border-radius:9px;overflow:hidden;cursor:crosshair;touch-action:none}
.dss-sv-dot{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.35);pointer-events:none}
.dss-hue{position:relative;height:12px;margin-top:11px;border-radius:999px;cursor:pointer;touch-action:none;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)}
.dss-hue-dot{position:absolute;top:-3px;width:8px;height:18px;margin-left:-4px;border:2px solid #fff;border-radius:3px;box-shadow:0 0 0 1px rgba(0,0,0,.25);pointer-events:none}
.dss-cp-row{display:flex;gap:8px;margin-top:12px}
.dss-cp-row input{flex:1;min-width:0;padding:7px 9px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-paper);color:var(--dss-ink);font:12px/1.4 var(--dss-mono)}
.dss-cp-row button{padding:0 10px;border:1px solid var(--dss-line);border-radius:7px;background:var(--dss-paper);color:var(--dss-ink-2);font-size:12px;cursor:pointer}
.dss-cp-row button:disabled{opacity:.5;cursor:default}
.dss-cp-preview{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}
.dss-cp-card{padding:7px 9px;border:1px solid var(--dss-line);border-left:3px solid var(--dss-blue);border-radius:7px;background:var(--dss-paper-2);color:var(--dss-ink-3);font-size:11px}
.dss-cp-card i{display:block;margin-bottom:2px;font-style:normal;font-size:10px}
.dss-cp-card b{color:var(--dss-ink);font-size:12px}
.dss-cp-foot{display:flex;justify-content:space-between;gap:10px;margin-top:11px;color:var(--dss-ink-3);font-size:11px}
.dss-cp-foot .ok{color:#047857}
.dss-cp-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
.dss-custom-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-items:stretch;margin-top:8px}
.dss-custom-row > .dss-colors{grid-column:2 / -1;margin:0;align-items:center}
.dss-custom-row > .dss-hint{grid-column:2 / -1;align-self:center}
.dss-colors.is-disabled .dss-color-item{opacity:.45}
.dss-colors.is-disabled .dss-link-btn{opacity:.45}
.dss-depth-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.dss-depth-tile{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:10px;border:1px solid var(--dss-line);border-radius:9px;background:var(--dss-paper);text-align:left;cursor:pointer}
.dss-depth-tile:hover{border-color:var(--dss-line-strong)}
.dss-depth-tile.is-selected{border-color:var(--dss-ink);box-shadow:0 0 0 1px var(--dss-ink) inset}
.dss-depth-tile:disabled{cursor:default;opacity:.65}
.dss-depth-name{display:flex;align-items:center;gap:6px;color:var(--dss-ink);font-size:13px;font-weight:600}
.dss-depth-name em{color:#067647;font-size:11px;font-style:normal;font-weight:500}
.dss-depth-hint{color:var(--dss-ink-3);font-size:11.5px;line-height:1.5}
.dss-preview-persona{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;border:1px solid var(--dss-line);border-radius:12px;background:var(--dss-paper)}
.dss-preview-persona b{color:var(--dss-ink);font-size:14px}
.dss-preview-persona span{color:var(--dss-ink-3);font-size:12.5px}
.dss-preview-persona i{color:var(--dss-ink-2);font-size:12.5px;font-style:normal;padding:2px 7px;border-radius:5px;background:var(--dss-paper-2)}
.dss-preview-persona em{color:var(--dss-ink-3);font-size:12.5px;font-style:italic}
.dss-preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dss-preview-cell{padding:10px 12px;border:1px solid var(--dss-line);border-radius:12px;background:var(--dss-paper)}
.dss-preview-cell.is-wide{grid-column:1 / -1}
.dss-preview-cell-head{margin-bottom:4px;color:var(--dss-ink-3);font-size:11px;letter-spacing:.04em}
.dss-preview-scope .dss-card,.dss-preview-scope .dss-table-wrap,.dss-preview-scope .dss-code{margin:6px 0}
.dss-identity-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.dss-inline-hint{color:var(--dss-ink-3);font-size:12px;line-height:1.6}
.dss-group{margin:10px 0;padding:2px 12px 8px;border:1px solid var(--dss-line);border-radius:10px;background:var(--dss-paper-2)}
.dss-group .dss-field{margin-top:12px}
.dss-group-title{margin:8px 0 0;color:var(--dss-ink-2);font-size:12px;font-weight:600}
.dss-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0 4px}
.dss-chip-btn{padding:3px 10px;border:1px solid var(--dss-line);border-radius:999px;background:var(--dss-paper);color:var(--dss-ink-2);font-size:12px;cursor:pointer}
.dss-chip-btn.is-selected{border-color:var(--dss-ink);background:var(--dss-ink);color:var(--dss-paper)}
.dss-os-row{display:flex;align-items:center;justify-content:space-between;gap:16px}
.dss-os-preview{margin-top:8px;padding:7px 10px;border:1px solid var(--dss-line);border-radius:8px;background:var(--dss-paper);color:var(--dss-ink-3);font-size:12.5px;font-style:italic}
.dss-behavior-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid var(--dss-line)}
.dss-behavior-row:last-child{border-bottom:0}
.dss-behavior-text{min-width:0}
.dss-behavior-label{color:var(--dss-ink);font-size:13px;font-weight:600}
`

    /** 插入配置页样式；返回移除函数。document 不可用时是空操作。 */
    const ensureConfigStyle = () => {
      if (typeof document === 'undefined' || document.head === null) return () => {}
      document.getElementById(CONFIG_STYLE_ID)?.remove()
      const style = document.createElement('style')
      style.id = CONFIG_STYLE_ID
      style.textContent = CONFIG_CSS
      document.head.appendChild(style)
      return () => {
        try {
          style.remove()
        } catch {
          // 移除失败不影响宿主。
        }
      }
    }

    const CARD_TYPES = new Map([
      ['结论', 'conclusion'], ['总结', 'conclusion'], ['答案', 'conclusion'],
      ['判断', 'decision'], ['决策', 'decision'],
      ['指标', 'metric'], ['数据', 'metric'],
      ['风险', 'risk'], ['注意', 'risk'], ['警告', 'risk'],
      ['下一步', 'next'], ['建议', 'next'], ['行动', 'next'], ['待办', 'next'],
      ['验收', 'accept'], ['通过', 'accept'], ['完成', 'accept'],
      ['讲解', 'explain'],
      ['重点', 'key'], ['关键', 'key'], ['短答', 'short'],
    ])
    const ICONS = [
      [/结论|总结|答案|判断/, '◆'],
      [/方案|计划|步骤|流程/, '▸'],
      [/风险|注意|警告|坑/, '⚠'],
      [/验收|检查|核对/, '✓'],
      [/对比|选型|取舍/, '⇄'],
      [/下一步|建议|行动|待办/, '→'],
      [/背景|原因|根因/, '◎'],
      [/指标|数据|结果/, '▦'],
    ]

    const CSS = `
.dss-scope {
  --dss-page:#f7f8fa;--dss-paper:#ffffff;--dss-paper-2:#f8fafc;
  --dss-ink:#101828;--dss-ink-2:#475467;--dss-ink-3:#667085;
  --dss-line:#e4e7ec;--dss-line-strong:#d0d5dd;
  --dss-blue:#2563eb;--dss-blue-hover:#1d4ed8;--dss-blue-text:#1d4ed8;--dss-th-text:#1e3a8a;--dss-blue-soft:#eff6ff;
  --dss-green:#067647;--dss-green-strong:#059669;--dss-green-text:#047857;--dss-green-soft:#f0faf4;
  --dss-amber:#b54708;--dss-amber-strong:#d97706;--dss-amber-text:#b54708;--dss-amber-soft:#fffbf3;
  --dss-explain:#7c3aed;--dss-explain-text:#6d28d9;--dss-explain-soft:#f5f3ff;--dss-explain-line:#ede9fe;
  --dss-red:#b42318;--dss-red-soft:#fef3f2;
  --dss-head-bg:linear-gradient(90deg,rgba(37,99,235,.18),rgba(37,99,235,.05));--dss-zebra:rgba(255,255,255,.55);
  --dss-code-bg:rgba(255,255,255,.72);--dss-code-border:#dbe7ff;--dss-code-text:#344054;
  --dss-shadow:0 1px 3px rgba(16,24,40,.05);
  --dss-sans:var(--dsh-font-family-text,system-ui,-apple-system,"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif);
  --dss-mono:var(--dsh-font-family-code,ui-monospace,Consolas,"SFMono-Regular",monospace);
  --dss-serif:var(--dsh-font-family-text,Georgia,"Times New Roman","Noto Serif SC","SimSun",serif);
  --dss-text-size:var(--dsh-content-font-size,13.5px);
  --dss-code-size:var(--dsh-code-font-size,12.5px);
}
/* 开场/收尾/身份头只是界面装饰：选中复制时跳过，正文保持干净（配置页承诺「复制不带」）。 */
.dss-persona-prefix,.dss-persona-suffix,[data-dsh-persona-head]{user-select:none;-webkit-user-select:none}
/* 卡片级复制：hover / 键盘聚焦才显示，触屏常显（无 hover 媒体查询兜底）。 */
.dss-scope .dss-card{position:relative}
.dss-scope .dss-card-copy,.dss-scope .dss-table-copy,.dss-scope .dss-reply-copy-btn{display:inline-grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--dss-ink-3);cursor:pointer;opacity:.6;transition:opacity .12s}
.dss-scope .dss-card-copy{position:absolute;top:6px;right:6px}
.dss-scope .dss-table-wrap{position:relative;margin:14px 0}
.dss-scope .dss-table-wrap{overflow-x:auto;overflow-y:hidden}
.dss-scope .dss-table-wrap > table{margin:0}
.dss-scope .dss-table-copy{position:absolute;top:6px;right:6px}
.dss-scope .dss-reply-copy{display:flex;justify-content:flex-end;margin:8px 0 0}
.dss-scope .dss-card:hover .dss-card-copy,.dss-scope .dss-card:focus-within .dss-card-copy,
.dss-scope .dss-table-wrap:hover .dss-table-copy,.dss-scope .dss-table-wrap:focus-within .dss-table-copy,
.dss-scope .dss-reply-copy:hover .dss-reply-copy-btn,.dss-scope .dss-reply-copy:focus-within .dss-reply-copy-btn{opacity:1}
.dss-scope .dss-card-copy:hover,.dss-scope .dss-table-copy:hover,.dss-scope .dss-reply-copy-btn:hover{background:var(--dss-paper-2);color:var(--dss-ink)}
@media (hover:none){.dss-scope .dss-card-copy,.dss-scope .dss-table-copy,.dss-scope .dss-reply-copy-btn{opacity:.85}}
body[data-ds-dark-theme] .dss-scope {
  --dss-page:#1a1b1e;--dss-paper:#242629;--dss-paper-2:#2b2e33;
  --dss-ink:#e6e9ef;--dss-ink-2:#b7bdc9;--dss-ink-3:#8a92a0;
  --dss-line:#363a41;--dss-line-strong:#4a4f59;
  --dss-blue:#3b82f6;--dss-blue-hover:#60a5fa;--dss-blue-text:#8ab4ff;--dss-th-text:#93c5fd;--dss-blue-soft:rgba(59,130,246,.16);
  --dss-green:#34d399;--dss-green-strong:#10b981;--dss-green-text:#34d399;--dss-green-soft:rgba(16,185,129,.14);
  --dss-amber:#fbbf24;--dss-amber-strong:#f59e0b;--dss-amber-text:#fbbf24;--dss-amber-soft:rgba(245,158,11,.12);
  --dss-explain:#a78bfa;--dss-explain-text:#c4b5fd;--dss-explain-soft:rgba(124,58,237,.18);--dss-explain-line:rgba(167,139,250,.25);
  --dss-red:#f87171;--dss-red-soft:rgba(248,113,113,.16);
  --dss-head-bg:linear-gradient(90deg,rgba(96,165,250,.24),rgba(96,165,250,.06));--dss-zebra:rgba(255,255,255,.03);
  --dss-code-bg:rgba(0,0,0,.28);--dss-code-border:rgba(96,165,250,.28);--dss-code-text:#c9d2e0;
  --dss-shadow:0 1px 3px rgba(0,0,0,.35);
}

body[data-dsh-structured-theme="codex"] .dss-scope {
  --dss-page:#f7f7f8;--dss-paper:#ffffff;--dss-paper-2:#f4f4f5;
  --dss-ink:#0d0d0d;--dss-ink-2:#3f3f46;--dss-ink-3:#71717a;
  --dss-line:#e4e4e7;--dss-line-strong:#d4d4d8;
  --dss-blue:#10a37f;--dss-blue-hover:#0d8a6a;--dss-blue-text:#0f7a5f;--dss-th-text:#065f46;--dss-blue-soft:#eef8f5;
  --dss-green:#047857;--dss-green-strong:#059669;--dss-green-text:#047857;--dss-green-soft:#f1f6de;
  --dss-amber:#b45309;--dss-amber-strong:#d97706;--dss-amber-text:#b45309;--dss-amber-soft:#fdf7ea;
  --dss-explain:#0f766e;--dss-explain-text:#0f766e;--dss-explain-soft:#ecfdf5;--dss-explain-line:#ccfbf1;
  --dss-red:#b91c1c;--dss-red-soft:#fef2f2;
  --dss-head-bg:linear-gradient(90deg,rgba(16,163,127,.16),rgba(16,163,127,.04));--dss-zebra:rgba(0,0,0,.02);
  --dss-code-bg:#f6f8f8;--dss-code-border:#d7e8e2;--dss-code-text:#27272a;
  --dss-shadow:0 1px 3px rgba(9,9,11,.06);
}
body[data-ds-dark-theme][data-dsh-structured-theme="codex"] .dss-scope {
  --dss-page:#0f0f10;--dss-paper:#1a1a1c;--dss-paper-2:#222226;
  --dss-ink:#ededf0;--dss-ink-2:#b4b4bb;--dss-ink-3:#8a8a93;
  --dss-line:#2e2e33;--dss-line-strong:#3f3f46;
  --dss-blue:#34d399;--dss-blue-hover:#6ee7b7;--dss-blue-text:#6ee7b7;--dss-th-text:#5eead4;--dss-blue-soft:rgba(52,211,153,.16);
  --dss-green:#34d399;--dss-green-strong:#10b981;--dss-green-text:#34d399;--dss-green-soft:rgba(52,211,153,.14);
  --dss-amber:#facc15;--dss-amber-strong:#eab308;--dss-amber-text:#facc15;--dss-amber-soft:rgba(250,204,21,.15);
  --dss-explain:#5eead4;--dss-explain-text:#5eead4;--dss-explain-soft:rgba(45,212,191,.14);--dss-explain-line:rgba(94,234,212,.25);
  --dss-red:#fb7185;--dss-red-soft:rgba(251,113,133,.18);
  --dss-head-bg:linear-gradient(90deg,rgba(52,211,153,.18),rgba(52,211,153,.05));--dss-zebra:rgba(255,255,255,.03);
  --dss-code-bg:rgba(0,0,0,.28);--dss-code-border:rgba(52,211,153,.26);--dss-code-text:#d4d4d8;
  --dss-shadow:0 1px 3px rgba(0,0,0,.4);
}
body[data-dsh-structured-theme="anthropic"] .dss-scope {
  --dss-page:#faf9f5;--dss-paper:#ffffff;--dss-paper-2:#f5f2ea;
  --dss-ink:#1f1e1d;--dss-ink-2:#514f4a;--dss-ink-3:#8a857c;
  --dss-line:#e8e2d6;--dss-line-strong:#d8d1c2;
  --dss-blue:#cc785c;--dss-blue-hover:#b8623f;--dss-blue-text:#a14a2e;--dss-th-text:#7c3a20;--dss-blue-soft:#fbf5f1;
  --dss-green:#3f7d4e;--dss-green-strong:#6f7d3a;--dss-green-text:#3f7d4e;--dss-green-soft:#f4f5e2;
  --dss-amber:#b45309;--dss-amber-strong:#d97706;--dss-amber-text:#b45309;--dss-amber-soft:#fcf3e2;
  --dss-explain:#9d5b6b;--dss-explain-text:#8a4b5a;--dss-explain-soft:#fdf2f4;--dss-explain-line:#f5d0d8;
  --dss-red:#b42318;--dss-red-soft:#fdf0ee;
  --dss-head-bg:linear-gradient(90deg,rgba(204,120,92,.18),rgba(204,120,92,.05));--dss-zebra:rgba(204,120,92,.035);
  --dss-code-bg:#f7f4ee;--dss-code-border:#e6ddcc;--dss-code-text:#3b352c;
  --dss-shadow:0 1px 3px rgba(60,50,35,.07);
}
body[data-ds-dark-theme][data-dsh-structured-theme="anthropic"] .dss-scope {
  --dss-page:#1c1b19;--dss-paper:#262421;--dss-paper-2:#2e2b26;
  --dss-ink:#ede7dc;--dss-ink-2:#c4bcae;--dss-ink-3:#9a9184;
  --dss-line:#3a3630;--dss-line-strong:#4b463e;
  --dss-blue:#e8a087;--dss-blue-hover:#f0b8a3;--dss-blue-text:#f0b8a3;--dss-th-text:#fbbf24;--dss-blue-soft:rgba(232,160,135,.16);
  --dss-green:#6ee7b7;--dss-green-strong:#34d399;--dss-green-text:#6ee7b7;--dss-green-soft:rgba(163,177,102,.14);
  --dss-amber:#e8aa5a;--dss-amber-strong:#d98c3f;--dss-amber-text:#e8aa5a;--dss-amber-soft:rgba(232,170,90,.18);
  --dss-explain:#f0a3b2;--dss-explain-text:#f5c2cc;--dss-explain-soft:rgba(240,163,178,.16);--dss-explain-line:rgba(240,163,178,.25);
  --dss-red:#f97066;--dss-red-soft:rgba(249,112,102,.18);
  --dss-head-bg:linear-gradient(90deg,rgba(232,160,135,.2),rgba(232,160,135,.06));--dss-zebra:rgba(255,255,255,.03);
  --dss-code-bg:rgba(0,0,0,.28);--dss-code-border:rgba(232,160,135,.24);--dss-code-text:#ddd5c8;
  --dss-shadow:0 1px 3px rgba(0,0,0,.42);
}

/* DSH：跟随 DSH 宿主原生黑白灰（host alias 变量，明暗自动切换），无品牌彩；状态也用灰阶 + 符号区分。 */
body[data-dsh-structured-theme="dsh"] .dss-scope {
  --dss-page:var(--dsw-alias-bg-base,#ffffff);--dss-paper:var(--dsw-alias-bg-l1,#ffffff);--dss-paper-2:var(--dsw-alias-bg-l2,#f5f5f5);
  --dss-ink:var(--dsw-alias-label-primary,#171717);--dss-ink-2:var(--dsw-alias-label-secondary,#4d4d4d);--dss-ink-3:var(--dsw-alias-label-tertiary,#8a8a8a);
  --dss-line:var(--dsw-alias-border-l1,#e5e5e5);--dss-line-strong:var(--dsw-alias-border-l2,#d4d4d4);
  --dss-blue:var(--dsw-alias-label-primary,#171717);--dss-blue-hover:var(--dsw-alias-label-secondary,#000000);--dss-blue-text:var(--dsw-alias-label-primary,#171717);--dss-th-text:var(--dsw-alias-label-primary,#171717);--dss-blue-soft:var(--dsw-alias-bg-l2,#f4f4f5);
  --dss-green:#3f3f46;--dss-green-strong:#27272a;--dss-green-text:#3f3f46;--dss-green-soft:#f1f1f2;
  --dss-amber:#52525b;--dss-amber-strong:#3f3f46;--dss-amber-text:#52525b;--dss-amber-soft:#f5f5f5;
  --dss-explain:#4b5563;--dss-explain-text:#374151;--dss-explain-soft:#f3f4f6;--dss-explain-line:#e5e7eb;
  --dss-red:#18181b;--dss-red-soft:#ececee;
  --dss-head-bg:linear-gradient(90deg,var(--dsw-alias-bg-l2,#f2f2f3),var(--dsw-alias-bg-l1,#ffffff));--dss-zebra:rgba(0,0,0,.02);
  --dss-code-bg:var(--dsw-alias-bg-l2,#f7f7f8);--dss-code-border:var(--dsw-alias-border-l1,#e5e5e5);--dss-code-text:var(--dsw-alias-label-secondary,#3f3f46);
  --dss-shadow:0 1px 3px rgba(0,0,0,.05);
}
body[data-ds-dark-theme][data-dsh-structured-theme="dsh"] .dss-scope {
  --dss-page:var(--dsw-alias-bg-base,#171717);--dss-paper:var(--dsw-alias-bg-l1,#1f1f1f);--dss-paper-2:var(--dsw-alias-bg-l2,#262626);
  --dss-ink:var(--dsw-alias-label-primary,#ededed);--dss-ink-2:var(--dsw-alias-label-secondary,#b0b0b0);--dss-ink-3:var(--dsw-alias-label-tertiary,#8a8a8a);
  --dss-line:var(--dsw-alias-border-l1,#303030);--dss-line-strong:var(--dsw-alias-border-l2,#3f3f46);
  --dss-blue:var(--dsw-alias-label-primary,#ededed);--dss-blue-hover:var(--dsw-alias-label-secondary,#ffffff);--dss-blue-text:var(--dsw-alias-label-primary,#ededed);--dss-th-text:var(--dsw-alias-label-primary,#ededed);--dss-blue-soft:var(--dsw-alias-bg-l2,#262626);
  --dss-green:#d4d4d8;--dss-green-strong:#f4f4f5;--dss-green-text:#d4d4d8;--dss-green-soft:rgba(255,255,255,.07);
  --dss-amber:#a1a1aa;--dss-amber-strong:#d4d4d8;--dss-amber-text:#a1a1aa;--dss-amber-soft:rgba(255,255,255,.05);
  --dss-explain:#d4d4d8;--dss-explain-text:#e4e4e7;--dss-explain-soft:rgba(255,255,255,.07);--dss-explain-line:rgba(255,255,255,.12);
  --dss-red:#fafafa;--dss-red-soft:rgba(255,255,255,.11);
  --dss-head-bg:linear-gradient(90deg,var(--dsw-alias-bg-l2,#262626),var(--dsw-alias-bg-l1,#1f1f1f));--dss-zebra:rgba(255,255,255,.03);
  --dss-code-bg:rgba(0,0,0,.35);--dss-code-border:var(--dsw-alias-border-l1,#303030);--dss-code-text:var(--dsw-alias-label-secondary,#c9c9c9);
  --dss-shadow:0 1px 3px rgba(0,0,0,.45);
}

.dss-scope .dss-card {
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 90%);
  box-shadow:var(--dss-shadow);color:var(--dss-ink-2);
}
.dss-scope .dss-card > p:first-child{margin-top:0}
.dss-scope .dss-card > p:last-child{margin-bottom:0}
.dss-scope .dss-card-conclusion,.dss-scope .dss-card-accept{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 90%);
}
.dss-scope .dss-card-next{
  border-left-color:var(--dss-green-strong);
  background:linear-gradient(180deg,var(--dss-green-soft),var(--dss-paper) 90%);
}
.dss-scope .dss-card-risk{
  border-left-color:var(--dss-amber-strong);
  background:linear-gradient(180deg,var(--dss-amber-soft),var(--dss-paper) 90%);
}
.dss-scope .dss-card-statement{
  border-left-color:var(--dss-blue);
  background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 90%);
}
.dss-scope .dss-card-short{
  border-left-color:var(--dss-blue);background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 90%);box-shadow:none;
}
.dss-scope .dss-card-short > p:first-child > strong:first-child:not([data-dss-inline]){
  display:block;width:100%;margin:0 0 8px;padding:0 0 6px;border-bottom:1px solid var(--dss-line);
  font:700 calc(var(--dss-text-size) * 12 / 13.5)/1.5 var(--dss-sans);letter-spacing:.04em;color:var(--dss-blue-text);
}
.dss-scope .dss-card-short > p{font-size:var(--dss-text-size);line-height:1.7;color:var(--dss-ink-2)}
.dss-scope .dss-card-explain{border-left-color:var(--dss-explain);background:linear-gradient(90deg,var(--dss-explain-soft),var(--dss-paper) 78%);box-shadow:none}
.dss-scope .dss-card-explain > p:first-child > strong:first-child{
  display:block;width:100%;margin:0 0 8px;padding:0 0 6px;border-bottom:1px solid var(--dss-explain-line);
  font:700 calc(var(--dss-text-size) * 12 / 13.5)/1.5 var(--dss-sans);letter-spacing:.04em;color:var(--dss-explain-text);
}
.dss-scope .dss-card-explain > p{font-size:var(--dss-text-size);line-height:1.7;color:var(--dss-ink-2)}
.dss-scope .dss-card-explain > p > strong:first-child{color:var(--dss-explain);font-weight:700}
.dss-scope .dss-card-conclusion > p:first-child > strong:first-child,
.dss-scope .dss-card-accept > p:first-child > strong:first-child,
.dss-scope .dss-card-next > p:first-child > strong:first-child,
.dss-scope .dss-card-risk > p:first-child > strong:first-child{
  display:block;width:100%;margin:0 0 10px;padding:0 0 7px;
  border-bottom:1px solid var(--dss-line);
  font:700 calc(var(--dss-text-size) * 12 / 13.5)/1.5 var(--dss-sans);letter-spacing:.04em;
  color:var(--dss-blue-text);
}
.dss-scope .dss-card-next > p:first-child > strong:first-child{color:var(--dss-green-text)}
.dss-scope .dss-card-risk > p:first-child > strong:first-child{color:var(--dss-amber-text)}
.dss-scope .dss-card-conclusion > p,.dss-scope .dss-card-accept > p,
.dss-scope .dss-card-next > p,.dss-scope .dss-card-risk > p{
  margin:.45em 0;font-size:var(--dss-text-size);line-height:1.7;color:var(--dss-ink-2);
}
.dss-scope .dss-card-conclusion > p:not(:first-child) > strong:first-child:not([data-dss-inline]),
.dss-scope .dss-card-accept > p:not(:first-child) > strong:first-child:not([data-dss-inline]){
  display:block;margin:0 0 6px;padding:0;border:0;
  font:700 calc(var(--dss-text-size) * 19 / 13.5)/1.45 var(--dss-serif);letter-spacing:.01em;color:var(--dss-ink);
}
.dss-scope .dss-card-conclusion > p strong,.dss-scope .dss-card-accept > p strong,
.dss-scope .dss-card-next > p strong,.dss-scope .dss-card-risk > p strong{color:var(--dss-ink);font-weight:700}
.dss-scope .dss-card-statement > p:first-child > strong:first-child:not([data-dss-inline]){
  display:block;margin:0 0 6px;padding:0;border:0;
  font:700 calc(var(--dss-text-size) * 19 / 13.5)/1.45 var(--dss-serif);letter-spacing:.01em;color:var(--dss-ink);
}
.dss-scope .dss-card-statement > p{font-size:var(--dss-text-size);line-height:1.7;color:var(--dss-ink-2)}
.dss-scope .dss-card-next ol{padding:0;margin:2px 0 0;list-style:none;counter-reset:dss-step}
.dss-scope .dss-card-next li{
  position:relative;margin:8px 0;padding:2px 0 0 30px;font-size:var(--dss-text-size);line-height:1.7;
  color:var(--dss-ink-2);counter-increment:dss-step;
}
.dss-scope .dss-card-next li::before{
  content:counter(dss-step,decimal);position:absolute;left:0;top:2px;
  display:grid;place-items:center;width:22px;height:22px;border-radius:50%;
  background:var(--dss-green-soft);color:var(--dss-green-text);font:600 calc(var(--dss-text-size) * 11 / 13.5)/1 var(--dss-mono);
}
.dss-scope .dss-card-risk p{color:var(--dss-ink-2)}
.dss-scope .dss-card-conclusion ol.dss-points{padding:0;margin:2px 0 0;list-style:none;counter-reset:dss-point}
.dss-scope .dss-card-conclusion ol.dss-points li{
  position:relative;margin:8px 0;padding:2px 0 0 30px;font-size:var(--dss-text-size);line-height:1.7;
  color:var(--dss-ink-2);counter-increment:dss-point;
}
.dss-scope .dss-card-conclusion ol.dss-points li::before{
  content:counter(dss-point,upper-alpha);position:absolute;left:0;top:2px;
  display:grid;place-items:center;width:22px;height:22px;border-radius:50%;
  background:var(--dss-blue-soft);color:var(--dss-blue-text);font:600 var(--dss-code-size,11px)/1 var(--dss-mono);
}
.dss-scope .dss-table tbody td[data-dss-row-index]::before{content:attr(data-dss-row-index);display:inline-block;min-width:1.1em;margin-right:6px;color:var(--dss-ink-3);font:600 calc(var(--dss-text-size) * 11 / 13.5)/1 var(--dss-mono);text-align:right;vertical-align:0}
.dss-scope .dss-table{
  width:100%;margin:14px 0;border:1px solid var(--dss-line);border-left:3px solid var(--dss-blue);
  border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;
  background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 62%);
  box-shadow:var(--dss-shadow);font-size:calc(var(--dss-text-size) * 13 / 13.5);color:var(--dss-ink-2);
}
.dss-scope .dss-table thead th{
  height:auto;padding:10px 16px!important;background:var(--dss-head-bg)!important;border-bottom:0;
  color:var(--dss-th-text)!important;font:600 calc(var(--dss-text-size) * 11.5 / 13.5)/1.5 var(--dss-sans)!important;letter-spacing:.08em!important;text-align:left;overflow-wrap:anywhere;
}
.dss-scope .dss-table th[data-dsh-structured-col="narrow"],.dss-scope .dss-table td[data-dsh-structured-col="narrow"]{width:1%;white-space:nowrap;min-width:0}
.dss-scope .dss-table[data-dsh-structured-tail="capped"] th:last-child,.dss-scope .dss-table[data-dsh-structured-tail="capped"] td:last-child{width:32%}
.dss-scope .dss-table tbody td{
  padding:11px 16px!important;border-bottom:1px solid var(--dss-line)!important;background:transparent;
  color:var(--dss-ink-2)!important;font-size:calc(var(--dss-text-size) * 13 / 13.5)!important;line-height:1.55!important;vertical-align:middle;overflow-wrap:anywhere;
}
.dss-scope .dss-table tbody td:first-child{color:var(--dss-ink)!important;font-weight:600!important;font-size:var(--dss-text-size)!important}
.dss-scope .dss-table tbody tr:nth-child(even){background:var(--dss-zebra)}
.dss-scope .dss-table tbody tr:last-child td{border-bottom:0}
.dss-scope .dss-table td[data-dsh-structured-status-cell]{white-space:nowrap}
.dss-scope .dss-table tbody td[data-dsh-structured-status-cell="success"]{background:var(--dss-green-soft);box-shadow:inset 3px 0 0 var(--dss-green)}
.dss-scope .dss-table tbody td[data-dsh-structured-status-cell="warn"]{background:var(--dss-amber-soft);box-shadow:inset 3px 0 0 var(--dss-amber)}
.dss-scope .dss-table tbody td[data-dsh-structured-status-cell="error"]{background:var(--dss-red-soft);box-shadow:inset 3px 0 0 var(--dss-red)}
.dss-scope .dss-code{
  margin:14px 0;padding:14px 16px;border:1px solid var(--dss-line);
  border-left:3px solid var(--dss-blue);border-radius:12px;
  background:linear-gradient(135deg,var(--dss-blue-soft),var(--dss-paper) 62%);
  box-shadow:var(--dss-shadow);
}
.dss-scope .dss-code > [class*="_bannerWrap"]{margin:0;padding:0;border:0;background:none;position:static;z-index:auto}
.dss-scope [class*="_fenceSeat"]:has(> .dss-code){margin:0}
.dss-scope .dss-code [data-code-block-banner]{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin:0 0 10px;padding:2px 0 7px!important;border:0;border-bottom:1px solid var(--dss-line);
  border-radius:0;background:transparent!important;color:var(--dss-blue-text)!important;
  font:700 calc(var(--dss-text-size) * 12 / 13.5)/1.5 var(--dss-sans)!important;letter-spacing:.04em;text-transform:none;
}
.dss-scope .dss-code [data-code-block-banner]::before{
  content:none;flex:none;color:var(--dss-blue-text);
}
.dss-scope .dss-code[data-dsh-structured-lang] [data-code-block-banner]::before{
  content:"代码 · ";
}
.dss-scope .dss-code [data-code-block-banner] > [class*="_heading"]{
  flex:1;min-width:0;justify-content:flex-start;text-align:left;color:inherit;
}
.dss-scope .dss-code [data-code-block-banner] > [class*="_actions"]{margin-left:auto;flex:none}
.dss-scope .dss-code > [data-code-block-content]{padding:0}
.dss-scope .dss-code pre{
  margin:0;padding:12px 14px;border:1px solid var(--dss-code-border);border-radius:8px;
  background:var(--dss-code-bg)!important;color:var(--dss-code-text)!important;
  font:var(--dss-code-size)/1.7 var(--dss-mono)!important;overflow:auto;
}
.dss-scope .dss-copy{
  display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:5px;
  background:transparent;color:var(--dss-ink-3);cursor:pointer;
}
.dss-scope .dss-copy:hover{background:var(--dss-paper-2);color:var(--dss-ink)}
.dss-scope .dss-copy-icon{position:relative;display:inline-block;width:13px;height:13px}
.dss-scope .dss-copy-icon::before{content:"";position:absolute;inset:0 3px 3px 0;border:1.5px solid currentColor;border-radius:2px}
.dss-scope .dss-copy-icon::after{content:"";position:absolute;inset:3px 0 0 3px;border:1.5px solid currentColor;border-radius:2px}
.dss-scope .dss-copy-ok{display:none;font:700 calc(var(--dss-code-size) * 12 / 12.5)/1 var(--dss-mono)}
.dss-scope .dss-copy[data-copied="1"] .dss-copy-icon{display:none}
.dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{display:inline;color:var(--dss-green)}




body[data-ds-dark-theme] .dss-scope .dss-card-short > p:first-child > strong:first-child:not([data-dss-inline]){color:var(--dss-blue-text)}


.dss-scope .dss-copy[data-copied="1"] .dss-copy-ok{color:var(--dss-green)}
.dss-scope.dss-persona-head{padding:0 0 10px}
.dss-scope.dss-persona-head .dss-chat-head{display:flex;align-items:center;gap:12px;padding:0}
.dss-scope.dss-persona-head .dss-chat-avatar{position:relative;display:grid;place-items:center;width:38px;height:38px;flex:none;overflow:hidden;border-radius:50%;background:var(--dss-blue-soft);box-shadow:0 0 0 3px var(--dss-page),0 2px 10px rgba(16,24,40,.18)}
.dss-scope.dss-persona-head .dss-chat-avatar img{width:100%;height:100%;object-fit:cover}
.dss-scope.dss-persona-head .dss-chat-id{min-width:0}
.dss-scope.dss-persona-head .dss-chat-name{display:block;color:var(--dss-ink);font-size:calc(var(--dss-text-size) * 16 / 13.5);font-weight:650;line-height:1.3}
.dss-scope.dss-persona-head .dss-chat-meta{display:block;color:var(--dss-ink-3);font:calc(var(--dss-code-size) * 12 / 12.5)/1.5 var(--dss-mono);overflow-wrap:anywhere}
.dss-scope .dss-persona-prefix{margin:0;color:var(--dss-ink-3);font:var(--dss-code-size)/1.7 var(--dss-mono)}
.dss-scope .dss-persona-suffix{margin:0;padding-top:8px;border-top:1px dotted var(--dss-line-strong);color:var(--dss-ink-3);font:calc(var(--dss-code-size) * 12 / 12.5)/1.65 var(--dss-mono);overflow-wrap:anywhere}

[class*="_markdown_"]{font-size:var(--dss-text-size);line-height:1.7;letter-spacing:.01em;color:var(--dss-ink-2)}
[class*="_markdown_"] p{margin:.7em 0}
[class*="_markdown_"] h1,[class*="_markdown_"] h2,[class*="_markdown_"] h3,
[class*="_markdown_"] h4,[class*="_markdown_"] h5,[class*="_markdown_"] h6{
  color:var(--dss-ink);font-family:var(--dss-serif);line-height:1.32;letter-spacing:-.01em;
}
[class*="_markdown_"] h1{font-size:calc(var(--dss-text-size) * 26 / 13.5);font-weight:700;margin:32px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--dss-line)}
[class*="_markdown_"] h2{font-size:calc(var(--dss-text-size) * 21 / 13.5);font-weight:700;margin:28px 0 10px;padding-left:12px;border-left:3px solid var(--dss-blue)}
[class*="_markdown_"] h3{font-size:calc(var(--dss-text-size) * 19 / 13.5);font-weight:650;margin:22px 0 8px}
[class*="_markdown_"] h2[data-dsh-structured-icon]{padding-left:42px;text-indent:-30px}
[class*="_markdown_"] h3[data-dsh-structured-icon]{padding-left:30px;text-indent:-30px}
[class*="_markdown_"] h4{font-size:calc(var(--dss-text-size) * 15 / 13.5);font-weight:650;margin:16px 0 6px}
[class*="_markdown_"] h5,[class*="_markdown_"] h6{font-size:calc(var(--dss-text-size) * 13 / 13.5);font-weight:700;margin:14px 0 6px;color:var(--dss-ink-3);text-transform:uppercase;letter-spacing:.06em}
[class*="_markdown_"] h2[data-dsh-structured-icon]::before,
[class*="_markdown_"] h3[data-dsh-structured-icon]::before{
  content:attr(data-dsh-structured-icon);display:inline-flex;align-items:center;justify-content:center;
  width:22px;height:22px;margin-right:8px;text-indent:0;border-radius:6px;
  background:var(--dss-blue-soft);color:var(--dss-blue-text);font-family:var(--dss-sans);font-size:calc(var(--dss-text-size) * 12 / 13.5);font-weight:700;vertical-align:2px;
}
[class*="_markdown_"] strong{font-weight:700;color:var(--dss-ink)}
[class*="_markdown_"] a{color:var(--dss-blue-text);text-decoration:none;border-bottom:1px solid rgba(37,99,235,.38)}
[class*="_markdown_"] a:hover{border-bottom-color:var(--dss-blue)}
[class*="_markdown_"] ul,[class*="_markdown_"] ol{padding-left:1.5em;margin:.6em 0}
[class*="_markdown_"] li{margin:.28em 0}
[class*="_markdown_"] li::marker{color:var(--dss-blue-text)}
[class*="_markdown_"] hr{height:1px;border:0;margin:28px 0;background:linear-gradient(90deg,transparent,var(--dss-line),transparent)}
[class*="_markdown_"] blockquote:not(.dss-card){
  margin:14px 0;padding:10px 14px;border-left:3px solid var(--dss-line-strong);
  background:var(--dss-paper-2);border-radius:0 10px 10px 0;color:var(--dss-ink-2);
}
[class*="_markdown_"] p[data-dsh-structured-lead="table"]{border:0;padding:0;margin:12px 0 8px;font-size:var(--dss-text-size);color:var(--dss-ink-2)}
[class*="_markdown_"] p[data-dsh-structured-lead="table"] strong{font-size:var(--dss-text-size);font-weight:650;color:var(--dss-ink)}
[class*="_markdown_"] :not(pre)>code{
  background:var(--dss-paper-2);border:1px solid var(--dss-line);border-radius:6px;
  padding:.12em .38em;font-size:.9em;color:var(--dss-blue-text);overflow-wrap:anywhere;
}
[class*="_markdown_"] p[data-dsh-structured-status],[class*="_markdown_"] li[data-dsh-structured-status]{
  border-left:3px solid var(--dss-blue);background:var(--dss-blue-soft);
  border-radius:0 6px 6px 0;padding:4px 10px;margin:.4em 0;
}
[class*="_markdown_"] p[data-dsh-structured-status="success"],[class*="_markdown_"] li[data-dsh-structured-status="success"]{--dss-blue:var(--dss-green);--dss-blue-soft:var(--dss-green-soft)}
[class*="_markdown_"] p[data-dsh-structured-status="warn"],[class*="_markdown_"] li[data-dsh-structured-status="warn"]{--dss-blue:var(--dss-amber);--dss-blue-soft:var(--dss-amber-soft)}
[class*="_markdown_"] p[data-dsh-structured-status="error"],[class*="_markdown_"] li[data-dsh-structured-status="error"]{--dss-blue:var(--dss-red);--dss-blue-soft:var(--dss-red-soft)}
@media (max-width:720px){
  [class*="_markdown_"]{font-size:calc(var(--dss-text-size) * 13 / 13.5)}
  [class*="_markdown_"] h1{font-size:calc(var(--dss-text-size) * 22 / 13.5)}
  [class*="_markdown_"] h2{font-size:calc(var(--dss-text-size) * 18 / 13.5)}
  [class*="_markdown_"] .dss-table{font-size:calc(var(--dss-text-size) * 12 / 13.5)}
  [class*="_markdown_"] .dss-table thead th,[class*="_markdown_"] .dss-table tbody td{padding:8px 10px}
}
@media (prefers-reduced-motion:reduce){
  [class*="_markdown_"] *{transition:none!important;animation:none!important}
}

/* 窄屏（手机 / 分栏窗口）：人格表格按最小可读宽度横向滚动，不把列压成一字一行。 */
@media (max-width:560px){
  .dss-scope .dss-table-wrap > .dss-table{min-width:520px}
  .dss-scope .dss-table th,.dss-scope .dss-table td{padding-left:10px!important;padding-right:10px!important}
}
`

    function iconFor(text) {
      for (const [pattern, icon] of ICONS) if (pattern.test(text)) return icon
      return null
    }

    function firstParagraph(block) {
      return [...(block.children ?? [])].find((element) => element.tagName === 'P') ?? null
    }

    function labelOf(block) {
      const first = firstParagraph(block)
      const strong = first?.firstElementChild
      if (!strong || strong.tagName !== 'STRONG') return null
      return (strong.textContent ?? '').replace(/[：:]\s*$/u, '').trim()
    }

    function cardTypeFor(block) {
      const label = labelOf(block)
      return label === null ? null : (CARD_TYPES.get(label) ?? null)
    }

    function isLabelLike(text) {
      return [...CARD_TYPES.keys()].some((label) => text.startsWith(label) && text !== label)
    }

    function inGenui(element) {
      try {
        return Boolean(element.closest?.('[data-genui], [class*="genui-root"]'))
      } catch {
        return false
      }
    }

    function inDiff(element) {
      try {
        return Boolean(element.closest?.('[data-diff], .md-diff, [class*="_diff_"], [class*="diff-view"], [class*="diff-block"], [data-testid*="diff"]'))
      } catch {
        return false
      }
    }

    function bannerLanguage(code) {
      const banner = code.querySelector?.('[data-code-block-banner]')
      const heading = banner?.querySelector?.('[class*="_heading"]')
      const raw = ((heading?.textContent ?? banner?.textContent) ?? '').trim().split(/\s+/)[0] ?? ''
      return raw.toLowerCase().replace(/[^a-z0-9+#]/g, '')
    }

    function isDiffCode(code) {
      const lang = bannerLanguage(code)
      return lang === 'diff' || lang === 'patch'
    }

    function displayUnits(text) {
      let units = 0
      for (const char of text) {
        const code = char.codePointAt(0)
        if (code === 0x200b || code === 0x200c || code === 0x200d || code === 0xfe0f || (code >= 0x0300 && code <= 0x036f)) continue
        const wide = code >= 0x1100 && (
          code <= 0x115f || code === 0x2329 || code === 0x232a ||
          (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
          (code >= 0xac00 && code <= 0xd7a3) ||
          (code >= 0xf900 && code <= 0xfaff) ||
          (code >= 0xfe30 && code <= 0xfe4f) ||
          (code >= 0xff00 && code <= 0xff60) ||
          (code >= 0xffe0 && code <= 0xffe6) ||
          (code >= 0x1f300 && code <= 0x1faff) ||
          (code >= 0x20000 && code <= 0x3fffd)
        )
        units += wide ? 2 : 1
      }
      return units
    }

    function statusFor(text) {
      if (/^✅/.test(text)) return 'success'
      if (/^⚠/.test(text)) return 'warn'
      if (/^❌/.test(text)) return 'error'
      return null
    }

    function isStatementCard(block) {
      if (inDiff(block)) return false
      const markdown = block.closest?.('[class*="_markdown_"]')
      if (!markdown) return false
      const first = [...markdown.querySelectorAll('blockquote')].find((element) => !inGenui(element) && !inDiff(element))
      if (first !== block) return false
      const paragraphs = [...block.children].filter((element) => element.tagName === 'P')
      const firstParagraph = paragraphs[0]
      const strong = firstParagraph?.firstElementChild
      if (!strong || strong.tagName !== 'STRONG') return false
      let previous = strong.previousSibling
      while (previous) {
        if (previous.nodeType === 1) return false
        if (previous.nodeType === 3 && (previous.textContent ?? '').trim() !== '') return false
        previous = previous.previousSibling
      }
      const title = (strong.textContent ?? '').trim()
      if (title.length === 0 || isLabelLike(title)) return false
      let rest = ''
      for (let node = strong.nextSibling; node; node = node.nextSibling) rest += node.textContent ?? ''
      const secondBody = paragraphs.slice(1).some((element) => (element.textContent ?? '').trim().length > 0)
      return rest.trim().length > 0 || secondBody
    }

    const CARD_CLASSES = {
      conclusion: 'dss-card-conclusion',
      decision: 'dss-card-conclusion',
      metric: 'dss-card-conclusion',
      key: 'dss-card-conclusion',
      next: 'dss-card-next',
      risk: 'dss-card-risk',
      accept: 'dss-card-accept',
      explain: 'dss-card-explain',
      short: 'dss-card-short',
      statement: 'dss-card-statement',
    }
    const ALL_CARD_CLASSES = ['dss-card', ...new Set(Object.values(CARD_CLASSES))]

    const classListOf = (element) => (element && element.classList && typeof element.classList.add === 'function' ? element.classList : null)

    const setCardClass = (block, type) => {
      const list = classListOf(block)
      if (!list) return
      for (const name of ALL_CARD_CLASSES) list.remove(name)
      if (type === null) return
      list.add('dss-card')
      const name = CARD_CLASSES[type]
      if (name) list.add(name)
    }

    const toggleClass = (element, name, on) => {
      const list = classListOf(element)
      if (!list) return
      if (on) list.add(name)
      else list.remove(name)
    }

    const markScopes = (root) => {
      const scopes = []
      if (root && typeof root.matches === 'function' && root.matches('[class*="_markdown_"]')) scopes.push(root)
      for (const element of root?.querySelectorAll?.('[class*="_markdown_"]') ?? []) scopes.push(element)
      for (const element of scopes) toggleClass(element, 'dss-scope', true)
    }

    // 只写属性、不改 React 受控子树：旧实现在这里 `cell.textContent = ''` 再塞一个胶囊 span，
    // React 之后对同一单元格 reconcile 时找不到原来的文本节点，抛 NotFoundError（宿主日志里的
    // DOMException），SlotErrorBoundary 捕获后把整个 conversation.chat.node 换成空 div —— 整条
    // 回复空白且刷新依旧空白。状态只落到属性上，视觉交给 CSS 属性选择器。
    const markStatusCell = (cell, status) => {
      if (!cell || typeof cell.setAttribute !== 'function') return
      if (cell.getAttribute?.(STATUS_CELL_ATTR) !== status) cell.setAttribute(STATUS_CELL_ATTR, status)
    }


    const ensureCodeCopy = (code) => {
      const banner = code?.querySelector?.('[data-code-block-banner]')
      if (!banner || typeof banner.appendChild !== 'function') return
      if (banner.querySelector?.(`[${COPY_ATTR}]`) || banner.querySelector?.('button')) return
      const doc = code.ownerDocument ?? (typeof document !== 'undefined' ? document : null)
      if (!doc || typeof doc.createElement !== 'function') return
      const button = doc.createElement('button')
      button.setAttribute('type', 'button')
      button.setAttribute('class', 'dss-copy')
      button.setAttribute(COPY_ATTR, '1')
      button.setAttribute(GENERATED_ATTR, '1')
      button.setAttribute('aria-label', '复制代码')
      const icon = doc.createElement('span')
      icon.setAttribute('class', 'dss-copy-icon')
      const ok = doc.createElement('span')
      ok.setAttribute('class', 'dss-copy-ok')
      ok.textContent = '✓'
      button.appendChild(icon)
      button.appendChild(ok)
      button.addEventListener?.('click', async () => {
        const pre = code.querySelector?.('pre')
        const text = pre?.textContent ?? code.textContent ?? ''
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
        } catch {
          // 剪贴板被宿主拒绝时保留反馈，不阻断渲染。
        }
        button.setAttribute('data-copied', '1')
        try { setTimeout(() => button.removeAttribute('data-copied'), 1200) } catch {}
      })
      banner.appendChild(button)
    }

    const personaToneFields = (raw) => {
      try {
        const doc = JSON.parse(String(raw ?? ''))
        return {
          prefix: typeof doc?.prefix === 'string' ? doc.prefix : '',
          suffix: typeof doc?.suffix === 'string' ? doc.suffix : '',
        }
      } catch {
        return { prefix: '', suffix: '' }
      }
    }

    const personaHeadConfig = (value = {}) => {
      const tone = personaToneFields(value.persona)
      return {
        pluginEnabled: value.enabled !== false,
        enabled: value.personaEnabled === true,
        // 身份头是子开关：缺字段（旧 profile）按开启处理，关闭只影响头像 / 名字 / 签名。
        headEnabled: value.personaHeadEnabled !== false,
        innerOsEnabled: value.personaInnerOsEnabled !== false,
        name: typeof value.personaName === 'string' && value.personaName.trim() ? value.personaName : DEFAULT_PROFILE_NAME,
        signature: typeof value.personaSignature === 'string' ? value.personaSignature : DEFAULT_PROFILE_SIGNATURE,
        avatar: typeof value.personaAvatar === 'string' ? value.personaAvatar : '',
        prefix: tone.prefix,
        suffix: tone.suffix,
      }
    }

    const personaContentSignature = (content, config) => JSON.stringify([content, config.prefix, config.suffix])

    const personaHash = (text) => {
      let hash = 5381
      const value = String(text ?? '')
      for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0
      return (hash >>> 0).toString(36) + ':' + value.length
    }

    const isPluginGenerated = (node) => {
      const element = node?.nodeType === 1 ? node : node?.parentElement
      try {
        return Boolean(element?.closest?.(`[${GENERATED_ATTR}]`))
      } catch {
        return false
      }
    }

    const isPersonaManaged = (markdown) => {
      if (personaRenderCache.has(markdown)) return true
      return Boolean(markdown?.hasAttribute?.(PERSONA_KIND_ATTR) || markdown?.hasAttribute?.(PERSONA_ERROR_ATTR) || markdown?.hasAttribute?.(PERSONA_PENDING_ATTR))
    }

    const clearPersonaPending = (markdown) => {
      const record = personaPendingErrors.get(markdown)
      if (!record) return
      if (record.timer !== null) {
        try { clearTimeout(record.timer) } catch {}
      }
      personaGraceTimers.delete(record.run)
      personaPendingErrors.delete(markdown)
      markdown?.removeAttribute?.(PERSONA_PENDING_ATTR)
    }

    const personaIsStreaming = (markdown) => {
      try {
        // 宿主完成信号（app.asar 实测）：AssistantMarkdown 根节点流式时写 data-streaming 属性（值为空串，
        // 靠「有无属性」判断）；ChatView 运行行写 data-chat-running 同样是空串。所以不能用 ="true" 匹配。
        return Boolean(markdown?.closest?.('[data-streaming], [data-chat-running], [aria-busy="true"], [data-state="running"]'))
      } catch {
        return false
      }
    }

    const personaEnvelopeSource = (markdown) => {
      const blocks = [...(markdown?.querySelectorAll?.('.md-code-block') ?? [])]
      if (blocks.length !== 1) return null
      const code = blocks[0]
      const text = code.querySelector?.('pre')?.textContent ?? ''
      if (!(bannerLanguage(code) === 'persona' || looksLikePersonaEnvelope(text) || looksLikeBrokenPersonaEnvelope(text))) return null
      return text
    }

    /**
     * 半截 JSON / 半截内容块不能立刻判 error：先保留宿主内容并进入可测试的
     * 稳定窗口；窗口内内容再变化就重试，宿主仍在流式就继续等，稳定且仍非法
     * 才显示「内容合同错误」。
     */
    const schedulePersonaError = (markdown, message, sourceText, syntaxError = false) => {
      const hash = personaHash(sourceText ?? '')
      const existing = personaPendingErrors.get(markdown)
      if (existing && existing.hash === hash) {
        markdown.setAttribute(PERSONA_PENDING_ATTR, '1')
        return 'pending'
      }
      clearPersonaPending(markdown)
      const run = () => {
        if (run.done) return
        run.done = true
        personaGraceTimers.delete(run)
        personaPendingErrors.delete(markdown)
        markdown?.removeAttribute?.(PERSONA_PENDING_ATTR)
        if (!personaModeState.enabled) return
        if (markdown?.isConnected === false) return
        const current = personaEnvelopeSource(markdown)
        if (current !== null && personaHash(current) !== hash) {
          renderPersonaMarkdown(markdown, personaModeState, undefined, { fresh: true, retry: true })
          return
        }
        if (personaIsStreaming(markdown)) {
          schedulePersonaError(markdown, message, current ?? sourceText, syntaxError)
          return
        }
        if (current === null && String(sourceText ?? '').trim() === '') return
        renderPersonaError(markdown, message, current ?? sourceText)
      }
      let timer = null
      try {
        timer = typeof setTimeout === 'function' ? setTimeout(run, PERSONA_GRACE_MS) : null
      } catch {
        timer = null
      }
      personaGraceTimers.add(run)
      personaPendingErrors.set(markdown, { hash, message, timer, run, syntaxError })
      markdown.setAttribute(PERSONA_PENDING_ATTR, '1')
      return 'pending'
    }

    /** 测试与手动 gate 用：同步执行待定窗口的回调。 */
    const flushPersonaErrors = () => {
      let guard = 0
      while (personaGraceTimers.size > 0 && guard < 20) {
        guard += 1
        for (const run of [...personaGraceTimers]) {
          try { run() } catch {}
        }
      }
    }

    const cleanPersonaMarkdown = (markdown) => {
      clearPersonaPending(markdown)
      personaRenderCache.delete(markdown)
      for (const node of [...(markdown.querySelectorAll?.('.dss-persona-prefix, .dss-persona-suffix') ?? [])]) node.remove()
      for (const attr of [PERSONA_KIND_ATTR, PERSONA_FALLBACK_ATTR, PERSONA_ERROR_ATTR, PERSONA_PENDING_ATTR]) markdown.removeAttribute?.(attr)
      decorateStructured(markdown)
    }

    /** 激活时快照：此前的消息是旧历史，之后任何重扫都不重写它们。 */
    const snapshotPersonaLegacy = () => {
      for (const markdown of document.querySelectorAll?.('[class*="_markdown_"]') ?? []) personaLegacyMarkdowns.add(markdown)
      let watermark = null
      for (const node of document.querySelectorAll?.('[data-chat-turn]') ?? []) {
        const turn = Number(node.getAttribute?.('data-chat-turn'))
        if (Number.isFinite(turn) && (watermark === null || turn > watermark)) watermark = turn
      }
      personaTurnWatermark = watermark
    }

    const isLegacyPersonaMarkdown = (markdown, flow) => {
      if (personaLegacyMarkdowns.has(markdown)) return true
      if (personaTurnWatermark === null) return false
      const turn = Number(flow?.getAttribute?.('data-chat-turn'))
      return Number.isFinite(turn) && turn <= personaTurnWatermark
    }

    const setPersonaModeConfig = (value = {}) => {
      const wasEnabled = personaModeState.enabled
      personaModeState = personaHeadConfig(value)
      if (typeof document === 'undefined') return
      if (personaModeState.enabled) document.body?.setAttribute(PERSONA_MODE_ATTR, '1')
      else document.body?.removeAttribute(PERSONA_MODE_ATTR)
      if (personaModeState.enabled && !wasEnabled) snapshotPersonaLegacy()
      if (!active) return
      // 旧消息不回溯：配置变化只影响新消息，不重扫历史。
    }

    const createPersonaHead = (doc, config) => {
      const head = doc.createElement('div')
      head.className = 'dss-scope dss-persona-head'
      head.setAttribute(PERSONA_HEAD_ATTR, '1')
      head.setAttribute(GENERATED_ATTR, '1')
      const row = doc.createElement('div')
      row.className = 'dss-chat-head'
      const avatar = doc.createElement('span')
      avatar.className = 'dss-chat-avatar'
      const image = doc.createElement('img')
      image.alt = ''
      image.src = config.avatar || DEFAULT_AVATAR
      avatar.appendChild(image)
      const id = doc.createElement('div')
      id.className = 'dss-chat-id'
      const name = doc.createElement('strong')
      name.className = 'dss-chat-name'
      const signature = doc.createElement('span')
      signature.className = 'dss-chat-meta'
      id.appendChild(name)
      id.appendChild(signature)
      row.appendChild(avatar)
      row.appendChild(id)
      head.appendChild(row)
      return head
    }

    const updatePersonaHead = (head, config) => {
      const image = head.querySelector?.('.dss-chat-avatar img')
      const src = config.avatar || DEFAULT_AVATAR
      if (image && image.getAttribute?.('src') !== src) image.src = src
      const name = head.querySelector?.('.dss-chat-name')
      if (name && name.textContent !== config.name) name.textContent = config.name
      const signature = head.querySelector?.('.dss-chat-meta')
      if (signature && signature.textContent !== config.signature) signature.textContent = config.signature
    }

    const findFlowScope = (markdown, flowOverride) => {
      try {
        const userLike = markdown.closest?.('[data-chat-flow-kind="user"], [data-chat-flow-kind="steering"], [data-chat-flow-kind="turn-trigger"]')
        if (userLike) return { userLike: true, assistant: null }
        // reasoning / 工作过程 / 上下文注入 / 压缩摘要都不是最终回复，不套内容合同。
        const groupPart = markdown.closest?.('[data-chat-group-part]')?.getAttribute?.('data-chat-group-part')
        if (groupPart && groupPart !== 'response') return { skip: true, assistant: null }
        if (markdown.closest?.('[data-variant="think"], [data-turn-process-inline], [data-turn-process], [data-step-process], [data-step-process-content], [data-step-process-body], [data-context-injection-body], [data-compaction-disclosure], [data-compaction-icon]')) {
          return { skip: true, assistant: null }
        }
        if (flowOverride !== undefined && flowOverride !== null) return { assistant: flowOverride }
        const flowItem = markdown.closest?.('[data-chat-flow-kind]')
        if (flowItem) {
          const kind = flowItem.getAttribute?.('data-chat-flow-kind')
          if (kind === 'assistant-step' || kind === 'assistant') return { assistant: flowItem }
          // 群组 / 压缩 / 过程 / 输入等其它 flow 不是模型回复。
          return { skip: true, assistant: null }
        }
        const response = markdown.closest?.('[data-chat-group-part="response"]')
        if (response) return { assistant: response }
        const assistant = markdown.closest?.('[class*="assistantContent"]')
        if (assistant) return { assistant }
        const slot = markdown.closest?.('[data-slot="conversation.chat.node"]')
        if (slot?.parentElement) return { assistant: slot.parentElement }
        // 完全不落在会话容器里（插件设置页 / 市场页 / 文档预览等 markdown）：不是模型回复。
        return { external: true, assistant: null }
      } catch {
        return { assistant: flowOverride ?? null }
      }
    }

    const mountPersonaHead = (flow, config) => {
      if (!flow) return null
      // 身份头子开关关闭：不创建也不更新，已有头由 renderPersonaMarkdown 统一移除。
      if (config?.headEnabled === false) return null
      let head = flow.querySelector?.(`[${PERSONA_HEAD_ATTR}]`)
      if (!head) {
        head = createPersonaHead(flow.ownerDocument ?? document, config)
        const slot = flow.querySelector?.('[data-slot="conversation.chat.node"]')
        if (slot) flow.insertBefore(head, slot)
        else flow.insertBefore(head, flow.firstChild)
      }
      updatePersonaHead(head, config)
      return head
    }

    const removePersonaHeads = (root) => {
      const inPreview = (element) => Boolean(element?.closest?.('.dss-persona-preview'))
      for (const head of root?.querySelectorAll?.(`[${PERSONA_HEAD_ATTR}]`) ?? []) {
        if (!inPreview(head)) head.remove()
      }
      const markdowns = root?.matches?.('[class*="_markdown_"]')
        ? [root]
        : [...(root?.querySelectorAll?.('[class*="_markdown_"]') ?? [])]
      for (const markdown of markdowns) {
        if (inPreview(markdown)) continue
        clearPersonaPending(markdown)
        personaRenderCache.delete(markdown)
      }
      for (const node of root?.querySelectorAll?.('.dss-persona-prefix, .dss-persona-suffix') ?? []) {
        if (!inPreview(node)) node.remove()
      }
      for (const element of root?.querySelectorAll?.(`[${PERSONA_KIND_ATTR}], [${PERSONA_FALLBACK_ATTR}], [${PERSONA_ERROR_ATTR}], [${PERSONA_PENDING_ATTR}]`) ?? []) {
        if (inPreview(element)) continue
        element.removeAttribute?.(PERSONA_KIND_ATTR)
        element.removeAttribute?.(PERSONA_FALLBACK_ATTR)
        element.removeAttribute?.(PERSONA_ERROR_ATTR)
        element.removeAttribute?.(PERSONA_PENDING_ATTR)
      }
    }

    const personaObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
    const personaText = (value) => typeof value === 'string' && value.trim().length > 0
    const strictKeys = (value, allowed) => Object.keys(value).every((key) => allowed.includes(key))

    // 模型偶尔把信封写短了：`{"version":1,…,"conclusion":{"lead":"…","body":"…"}`——少一层 }、
    // suggestions / risk 整段没写（session-87d46d52 连续两条都是这个形状）。语法坏但语义完整，
    // 补上闭合括号就能救回来；只在字符串外补，且补到配平为止。
    const balanceTruncatedJson = (text) => {
      const source = String(text ?? '')
      let depth = 0
      let inString = false
      let escaped = false
      for (let i = 0; i < source.length; i += 1) {
        const ch = source[i]
        if (inString) {
          if (escaped) { escaped = false; continue }
          if (ch === '\\') { escaped = true; continue }
          if (ch === '"') inString = false
          continue
        }
        if (ch === '"') { inString = true; continue }
        if (ch === '{' || ch === '[') depth += 1
        else if (ch === '}' || ch === ']') depth -= 1
      }
      if (depth <= 0 && !inString) return null
      let out = source
      if (inString) out += '"'
      for (let i = 0; i < Math.max(0, depth); i += 1) out += '}'
      return out
    }

    // lenient 只用在「JSON 本身要修」的抢救路径：模型把信封写短了（少一层 }、suggestions /
    // risk 整段没写）时，宁可少一张卡也要把已有的内容渲染成卡，绝不让整条回复降级成普通文字。
    // 正常路径仍按完整合同校验，流式半截不会被提前当成品渲染。
    // rows 漏键的修复常带出「短行」（某行少写一个单元格）：补空串即可，
    // 不删任何内容；若某行比表头还长则放弃修复（截断会丢信息，宁可降级）。
    const padShortTableRows = (value) => {
      const table = value?.table
      if (!table || !Array.isArray(table.head) || !Array.isArray(table.rows)) return value
      const width = table.head.length
      if (!table.rows.every((row) => Array.isArray(row) && row.length <= width)) return null
      return {
        ...value,
        table: {
          head: [...table.head],
          rows: table.rows.map((row) => (row.length === width ? [...row] : [...row, ...Array(width - row.length).fill('')])),
        },
      }
    }

    // 模型偶尔把 table.rows 的键名整个漏掉（head 数组后直接跟行数组）：
    //   "table":{"head":["项","证据"],["崩溃类型",…]}
    // 语法上多了一个裸数组，JSON.parse 直接失败，整条降级成纯文本。
    // 这里只在 "head" 数组结束后紧跟 `,` + `[` 的位置补一个 "rows": —— 证据充分、改动最小。
    // 模型偶尔把 table.rows 的键名整个漏掉，且把多行写成连续裸数组：
    //   "table":{"head":["项","证据"],["崩溃类型",…],["高危…",…]}
    // 语法上是一串裸数组，JSON.parse 直接失败。这里把这串数组整体包成 "rows":[…]。
    // 模型把 table.rows 写成「漏键 + 落单右括号」的形式：
    //   "table":{"head":["项","证据"],[r1],[r2]]}
    // 既没有 "rows":[ 前缀，结尾又多一个本该闭合 rows 的 ]。
    // 这里把连续裸数组整体包成 "rows":[…] ，并吃掉紧随其后的落单 ]。
    const repairMissingRowsKey = (text) => {
      const source = String(text ?? '')
      const headAt = source.indexOf('"head"')
      if (headAt < 0) return null

      const skipSpace = (i) => {
        while (i < source.length && /\s/.test(source[i])) i += 1
        return i
      }
      const arrayEndAt = (from) => {
        let depth = 0
        let inString = false
        let escaped = false
        for (let i = from; i < source.length; i += 1) {
          const ch = source[i]
          if (inString) {
            if (escaped) { escaped = false; continue }
            if (ch === '\\') { escaped = true; continue }
            if (ch === '"') inString = false
            continue
          }
          if (ch === '"') { inString = true; continue }
          if (ch === '[') depth += 1
          else if (ch === ']') {
            depth -= 1
            if (depth === 0) return i
          }
        }
        return -1
      }

      const headStart = source.indexOf('[', headAt)
      if (headStart < 0) return null
      const headEnd = arrayEndAt(headStart)
      if (headEnd < 0) return null

      let i = skipSpace(headEnd + 1)
      if (source[i] !== ',') return null
      i = skipSpace(i + 1)
      if (source[i] !== '[') return null
      const firstRowStart = i

      let lastRowEnd = -1
      let cursor = firstRowStart
      for (;;) {
        const rowEnd = arrayEndAt(cursor)
        if (rowEnd < 0) return null
        lastRowEnd = rowEnd
        let next = skipSpace(rowEnd + 1)
        if (source[next] !== ',') break
        next = skipSpace(next + 1)
        if (source[next] !== '[') break
        cursor = next
      }

      // 落单的 ] ：仅当后面紧跟 } 或 , 时才算 rows 的孤立闭合括号
      let tailStart = lastRowEnd + 1
      const afterRow = skipSpace(tailStart)
      let dropOrphan = false
      if (source[afterRow] === ']') {
        const afterBracket = skipSpace(afterRow + 1)
        if (source[afterBracket] === '}' || source[afterBracket] === ',') {
          dropOrphan = true
          tailStart = afterRow + 1
        }
      }

      return source.slice(0, firstRowStart)
        + '"rows":[' + source.slice(firstRowStart, lastRowEnd + 1) + ']'
        + (dropOrphan ? '' : '')
        + source.slice(tailStart)
    }

    const validatePersonaContent = (raw, { lenient = false } = {}) => {
      if (!personaObject(raw)) return { ok: false, error: 'JSON 必须是对象' }
      if (raw.version !== 1) return { ok: false, error: 'version 必须为 1' }
      const validateInnerOs = () => raw.innerOs === undefined || (personaText(raw.innerOs) && raw.innerOs.length <= 30)
      if (!validateInnerOs()) return { ok: false, error: 'innerOs 必须是 ≤30 字的非空字符串' }
      if (raw.kind === 'short') {
        if (!strictKeys(raw, ['version', 'kind', 'text', 'innerOs'])) return { ok: false, error: 'short 含未定义字段' }
        if (!personaText(raw.text)) return { ok: false, error: 'short.text 必须是非空字符串' }
        return { ok: true, content: { kind: 'short', text: raw.text, ...(raw.innerOs === undefined ? {} : { innerOs: raw.innerOs }) } }
      }
      if (raw.kind !== 'normal' && raw.kind !== 'table') return { ok: false, error: 'kind 只能是 normal / short / table' }
      const allowed = raw.kind === 'table' ? ['version', 'kind', 'conclusion', 'suggestions', 'risk', 'explanation', 'table', 'innerOs'] : ['version', 'kind', 'conclusion', 'suggestions', 'risk', 'explanation', 'innerOs']
      if (!strictKeys(raw, allowed)) return { ok: false, error: raw.kind + ' 含未定义字段' }
      const conclusion = raw.conclusion
      if (!personaObject(conclusion) || !strictKeys(conclusion, ['lead', 'body', 'points'])) return { ok: false, error: 'conclusion 形状非法' }
      if (!personaText(conclusion.lead)) return { ok: false, error: 'conclusion.lead 必须是非空字符串' }
      if (conclusion.body !== undefined && typeof conclusion.body !== 'string') return { ok: false, error: 'conclusion.body 必须是字符串' }
      if (conclusion.points !== undefined && (!Array.isArray(conclusion.points) || conclusion.points.length < 1 || conclusion.points.length > 4 || !conclusion.points.every(personaText))) {
        return { ok: false, error: 'conclusion.points 必须是 1-4 条非空字符串' }
      }
      const explanation = raw.explanation
      if (explanation !== undefined) {
        if (!personaObject(explanation) || !strictKeys(explanation, ['analogy', 'example'])) return { ok: false, error: 'explanation 形状非法' }
        const explanationFields = ['analogy', 'example'].filter((key) => explanation[key] !== undefined)
        if (explanationFields.length === 0) return { ok: false, error: 'explanation 至少需要 analogy 或 example' }
        if (!explanationFields.every((key) => personaText(explanation[key]))) return { ok: false, error: 'explanation.analogy / example 必须是非空字符串' }
      }
      // suggestions / risk 缺失按「模型少写了一段」处理：宁可少一张卡，也不能让整条回复掉光
      // （2026-11-16 实机：连续两条信封只写到 conclusion，整条回复降级成普通文字）。
      const suggestions = raw.suggestions === undefined && lenient ? [] : raw.suggestions
      const suggestionsOk = Array.isArray(suggestions)
        && (lenient ? suggestions.length <= 5 : suggestions.length >= 1 && suggestions.length <= 5)
        && suggestions.every(personaText)
      if (!suggestionsOk) return { ok: false, error: 'suggestions 必须是 1-5 条非空字符串' }
      const risk = raw.risk === undefined && lenient ? '' : raw.risk
      if (risk !== '' && !personaText(risk)) return { ok: false, error: 'risk 必须是字符串' }
      const content = {
        kind: raw.kind,
        conclusion: {
          lead: conclusion.lead,
          ...(conclusion.body === undefined ? {} : { body: conclusion.body }),
          ...(Array.isArray(conclusion.points) ? { points: [...conclusion.points] } : {}),
        },
        ...(explanation === undefined ? {} : {
          explanation: {
            ...(explanation.analogy === undefined ? {} : { analogy: explanation.analogy }),
            ...(explanation.example === undefined ? {} : { example: explanation.example }),
          },
        }),
        suggestions: [...suggestions],
        risk,
        ...(raw.innerOs === undefined ? {} : { innerOs: raw.innerOs }),
      }
      if (raw.kind === 'table') {
        const table = raw.table
        if (!personaObject(table) || !strictKeys(table, ['head', 'rows'])) return { ok: false, error: 'table 形状非法' }
        if (!Array.isArray(table.head) || table.head.length < 2 || table.head.length > 6 || !table.head.every(personaText)) return { ok: false, error: 'table.head 必须是 2-6 个非空表头' }
        if (!Array.isArray(table.rows) || table.rows.length < 1 || table.rows.length > 20) return { ok: false, error: 'table.rows 必须是 1-20 行' }
        if (!table.rows.every((row) => Array.isArray(row) && row.length === table.head.length && row.every((cell) => typeof cell === 'string'))) return { ok: false, error: 'table.rows 行列数必须与 head 一致' }
        content.table = { head: [...table.head], rows: table.rows.map((row) => [...row]) }
      }
      return { ok: true, content }
    }

    // JSON 不接受这些不可见字符；模型输出里出现一个就会让整段解析失败。
    // 只剥离不影响语义的一类，其余字符保持原样以免掩盖真实问题。
    // JSON 只认空格 / tab / LF / CR；模型输出里混入的任何其它不可见字符都会让整段解析失败。
    // 这里按码点过滤掉不可见字符，不动可见内容，避免一个 ZWSP 把整条回复判死。
    // 模型偶尔把 body 写在根上（conclusion 里只放 lead），形如
    // {"conclusion":{"lead":"…"},"body":"…"}：JSON 语法本身没问题，只违反内容合同。
    // 在「修复解析失败」的路径上把根级 body 挪回 conclusion.body，避免整条回复被判死。
    const normalizePersonaObject = (value) => {
      if (!personaObject(value)) return value
      const conclusion = value.conclusion
      if (!personaObject(conclusion)) return value
      if (typeof value.body !== 'string' || conclusion.body !== undefined) return value
      const rest = { ...value }
      delete rest.body
      return { ...rest, conclusion: { ...conclusion, body: value.body } }
    }

    const stripInvisibleJsonChars = (text) => {
      let out = ''
      for (const ch of String(text ?? '')) {
        const code = ch.codePointAt(0)
        if (code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d) { out += ch; continue }
        if (code >= 0x21 && code <= 0x7e) { out += ch; continue }
        if (code >= 0xa0 && code <= 0x10ffff && !isInvisibleJsonChar(code)) out += ch
      }
      return out
    }
    const isInvisibleJsonChar = (code) => (
      (code >= 0x200b && code <= 0x200f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2060 && code <= 0x2064) ||
      code === 0xfeff || code === 0x180e || code === 0x00a0 || code === 0x2007 ||
      code === 0x202f || code === 0x2028 || code === 0x2029 || code === 0x0085 ||
      code === 0x000b || code === 0x000c
    )

    // 模型在中文里直接写 ASCII 双引号（"这份"低"不是系统的功劳"），JSON 就断在第一个内层引号上。
    // 这里按结构判断：维护对象/数组栈并区分「键字符串」与「值字符串」，
    // 值字符串里只有其后紧跟 , } ] 或结尾的引号才是收尾引号，其余按内容引号转义；
    // 键字符串的收尾引号判据是其后紧跟 :。避免把 "a":1 这类值内片段误当成键。
    // forceContent：判定为「收尾」但实际是内容的引号位置集合（由候选回退搜索提供）。
    const repairInnerQuotes = (text, forceContent) => {
      const source = String(text ?? '')
      const stack = []
      let out = ''
      let inString = false
      let stringIsKey = false
      let escaped = false
      for (let i = 0; i < source.length; i += 1) {
        const ch = source[i]
        if (inString) {
          if (escaped) { out += ch; escaped = false; continue }
          if (ch === '\\') { out += ch; escaped = true; continue }
          // JSON 不允许字符串里有裸控制字符；模型常把换行 / 制表符直接写进去，先转义再判引号。
          if (ch === '\n') { out += '\\n'; continue }
          if (ch === '\r') { out += '\\r'; continue }
          if (ch === '\t') { out += '\\t'; continue }
          if (ch < ' ') { out += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'); continue }
          if (ch !== '"') { out += ch; continue }
          let lookahead = i + 1
          while (lookahead < source.length && /\s/.test(source[lookahead])) lookahead += 1
          const next = source[lookahead]
          const closes = stringIsKey
            ? (next === ':' || next === undefined)
            : (next === undefined || next === ',' || next === '}' || next === ']')
          if (closes && !(forceContent && forceContent.has(i))) { out += ch; inString = false } else { out += '\\"' }
          continue
        }
        if (ch === '"') {
          const top = stack[stack.length - 1]
          stringIsKey = Boolean(top && top.type === 'object' && top.expectKey)
          inString = true
          out += ch
          continue
        }
        if (ch === '{') { stack.push({ type: 'object', expectKey: true }); out += ch; continue }
        if (ch === '[') { stack.push({ type: 'array', expectKey: false }); out += ch; continue }
        if (ch === '}' || ch === ']') { stack.pop(); out += ch; continue }
        if (ch === ',') {
          const top = stack[stack.length - 1]
          if (top && top.type === 'object') top.expectKey = true
          out += ch
          continue
        }
        if (ch === ':') {
          const top = stack[stack.length - 1]
          if (top && top.type === 'object') top.expectKey = false
          out += ch
          continue
        }
        out += ch
      }
      return out
    }

    const topLevelJsonEnd = (text) => {
      const source = String(text ?? '')
      let depth = 0
      let inString = false
      let escaped = false
      for (let i = 0; i < source.length; i += 1) {
        const ch = source[i]
        if (inString) {
          if (escaped) { escaped = false; continue }
          if (ch === '\\') { escaped = true; continue }
          if (ch === '"') inString = false
          continue
        }
        if (ch === '"') { inString = true; continue }
        if (ch === '{' || ch === '[') { depth += 1; continue }
        if (ch === '}' || ch === ']') {
          depth -= 1
          if (depth === 0) return i + 1
          continue
        }
      }
      return -1
    }

    // 引号修复的候选搜索：先用默认判定；解析不成时，回溯把「被判成收尾」的引号
    // 逐个改成内容引号再试（深度 ≤3、总尝试 ≤80），解决 `"他说"好",然后走了"`、
    // `见 ["A","B"] 列表`、table 单元格 `[["X","Y"]]` 这类内层引号后紧邻 ASCII 标点。
    const quoteRepairCandidates = (text) => {
      const base = String(text ?? '')
      const results = []
      let attempts = 0
      const scan = (forced) => {
        const source = base
        const stack = []
        let out = ''
        let inString = false
        let stringIsKey = false
        let escaped = false
        const closings = []
        for (let i = 0; i < source.length; i += 1) {
          const ch = source[i]
          if (inString) {
            if (escaped) { out += ch; escaped = false; continue }
            if (ch === '\\') { out += ch; escaped = true; continue }
            if (ch === '\n') { out += '\\n'; continue }
            if (ch === '\r') { out += '\\r'; continue }
            if (ch === '\t') { out += '\\t'; continue }
            if (ch < ' ') { out += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'); continue }
            if (ch !== '"') { out += ch; continue }
            let lookahead = i + 1
            while (lookahead < source.length && /\s/.test(source[lookahead])) lookahead += 1
            const next = source[lookahead]
            const closes = stringIsKey
              ? (next === ':' || next === undefined)
              : (next === undefined || next === ',' || next === '}' || next === ']')
            if (closes && !(forced && forced.has(i))) {
              out += ch
              inString = false
              if (!stringIsKey) closings.push(i)
            } else {
              out += '\\"'
            }
            continue
          }
          if (ch === '"') {
            const top = stack[stack.length - 1]
            stringIsKey = Boolean(top && top.type === 'object' && top.expectKey)
            inString = true
            out += ch
            continue
          }
          if (ch === '{') { stack.push({ type: 'object', expectKey: true }); out += ch; continue }
          if (ch === '[') { stack.push({ type: 'array', expectKey: false }); out += ch; continue }
          if (ch === '}' || ch === ']') { stack.pop(); out += ch; continue }
          if (ch === ',') {
            const top = stack[stack.length - 1]
            if (top && top.type === 'object') top.expectKey = true
            out += ch
            continue
          }
          if (ch === ':') {
            const top = stack[stack.length - 1]
            if (top && top.type === 'object') top.expectKey = false
            out += ch
            continue
          }
          out += ch
        }
        return { candidate: out, closings }
      }
      const tryParse = (candidate) => {
        let parsed
        try { parsed = JSON.parse(candidate) } catch { return null }
        const end = topLevelJsonEnd(candidate)
        if (end <= 0) return null
        if (candidate.slice(end).replace(/\s+/g, '').length > 0) return null
        return parsed
      }
      const search = (forced, depth) => {
        if (attempts >= 120 || results.length >= 8) return
        attempts += 1
        const { candidate, closings } = scan(forced)
        if (candidate === base) return
        const parsed = tryParse(candidate)
        // 语法能过不代表语义对（table 行多一列也能 parse），所以把所有能 parse 的候选都收下，
        // 交给外层的 validatePersonaContent 逐个挑。
        if (parsed) results.push({ candidate, parsed, forced: forced ? forced.size : 0 })
        if (depth >= 3 || results.length >= 8) return
        const pending = closings.filter((position) => !(forced && forced.has(position)))
        for (let i = pending.length - 1; i >= 0; i -= 1) {
          const next = new Set(forced ?? [])
          next.add(pending[i])
          if (results.length >= 8 || attempts >= 120) return
          search(next, depth + 1)
        }
      }
      search(undefined, 0)
      // 打分：多转义可能把结构引号也吞进字符串（table 表头变成带引号的 "A"），
      // 所以先罚「首尾都带引号的字符串」，再优先少转义，最后按搜索顺序。
      const edgeQuoted = (value) => {
        if (typeof value === 'string') return value.length > 1 && value.startsWith('"') && value.endsWith('"') ? 1 : 0
        if (Array.isArray(value)) return value.reduce((sum, item) => sum + edgeQuoted(item), 0)
        if (value && typeof value === 'object') return Object.values(value).reduce((sum, item) => sum + edgeQuoted(item), 0)
        return 0
      }
      // 文本里的引号通常成对；某个字符串里引号个数是奇数，说明边界被切错了。
      const oddQuoted = (value) => {
        if (typeof value === 'string') {
          let count = 0
          for (const ch of value) if (ch === '"') count += 1
          return count % 2
        }
        if (Array.isArray(value)) return value.reduce((sum, item) => sum + oddQuoted(item), 0)
        if (value && typeof value === 'object') return Object.values(value).reduce((sum, item) => sum + oddQuoted(item), 0)
        return 0
      }
      for (const result of results) {
        result.penalty = edgeQuoted(result.parsed)
        result.unbalanced = oddQuoted(result.parsed)
      }
      // 依次惩罚：首尾带引号的字符串 → 引号奇数个的字符串 → 转义数奇偶 → 转义数量。
      results.sort((a, b) => (a.penalty - b.penalty)
        || (a.unbalanced - b.unbalanced)
        || ((a.forced % 2) - (b.forced % 2))
        || (a.forced - b.forced))
      return results
    }

    function looksLikePersonaEnvelope(text) {
      return /^\s*\{/.test(text) && /"version"\s*:\s*1/.test(text) && /"kind"\s*:\s*"(?:normal|short|table)"/.test(text)
    }

    // 形状像信封但写坏了：version=1 + kind 是任意字符串 + 只含合同字段。
    // 典型是模型把 kind 写成 "text"，或只写了 kind 就没了内容；严格检测不认，
    // 结果整条回复以一个「代码块」把 JSON 摊给用户（2026-11-16 实机）。
    // 条件仍然从严：必须能解析成对象、只含合同键，避免误伤正文里的普通 JSON 示例。
    const PERSONA_ENVELOPE_KEYS = ['version', 'kind', 'conclusion', 'suggestions', 'risk', 'table', 'text']
    function looksLikeBrokenPersonaEnvelope(text) {
      const source = String(text ?? '').trim()
      if (!source.startsWith('{') || source.length > 8192) return false
      if (!/"version"\s*:\s*1/.test(source) || !/"kind"\s*:\s*"/.test(source)) return false
      let parsed
      try {
        parsed = JSON.parse(source)
      } catch {
        return false
      }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return false
      if (parsed.version !== 1 || typeof parsed.kind !== 'string') return false
      return Object.keys(parsed).every((key) => PERSONA_ENVELOPE_KEYS.includes(key))
    }

    // 裸信封识别：模型偶尔不包 ```persona 围栏，把 JSON 直接写在正文里。
    // 条件从严（防误伤正文里贴的 JSON 示例）：
    // 1) 整条 markdown 的可见文本以 { 开头（允许少量前导空白字符）；
    // 2) 文本里出现 ≥2 个合同特征键（version/kind/conclusion/suggestions/risk）；
    // 3) 整体长度 ≤ 8KB，且解析出的对象能通过 validatePersonaContent。
    const BARE_ENVELOPE_MAX = 8192
    const barePersonaEnvelopeText = (markdown) => {
      const text = String(markdown?.textContent ?? '').trim()
      if (!text.startsWith('{') || text.length > BARE_ENVELOPE_MAX) return null
      const featureKeys = ['"version"', '"kind"', '"conclusion"', '"suggestions"', '"risk"']
      const hits = featureKeys.filter((key) => text.includes(key)).length
      if (hits < 3) return null
      const start = text.indexOf('{')
      const open = text.lastIndexOf('}')
      if (open <= start) return null
      const candidate = text.slice(start, open + 1)
      try {
        const parsed = JSON.parse(candidate)
        const validated = validatePersonaContent(parsed)
        if (!validated.ok) return null
        return candidate
      } catch {
        return null
      }
    }

    // 把裸 JSON 段落从 markdown 里移除：找到以该 JSON 文本开头的段落并整段删除。
    const removeBareEnvelopeNodes = (markdown, envelopeText) => {
      const prefix = String(envelopeText ?? '').slice(0, 40)
      if (!prefix) return
      for (const node of [...(markdown.children ?? [])]) {
        const own = node.textContent ?? ''
        if (own.includes(prefix)) { node.remove(); return }
      }
    }

    const extractPersonaEnvelope = (markdown) => {
      const blocks = [...(markdown.querySelectorAll?.('.md-code-block') ?? [])]
      const personaBlocks = blocks.filter((code) => {
        if (bannerLanguage(code) === 'persona') return true
        const raw = code.querySelector?.('pre')?.textContent ?? ''
        return looksLikePersonaEnvelope(raw) || looksLikeBrokenPersonaEnvelope(raw)
      })
      if (personaBlocks.length === 0) return { kind: 'none' }
      const texts = personaBlocks.map((code) => code.querySelector('pre')?.textContent ?? '')
      // 多个 persona 块才是冲突；其它代码块是模型的正常内容，不算冲突。
      if (personaBlocks.length > 1) return { ok: false, error: 'persona 内容块必须唯一', conflict: true, texts }
      const code = personaBlocks[0]
      // 块外内容不再判 error：模型可能自然带一句正文。块存在时优先按信封渲染；
      // 只清掉块外的插件无法渲染的裸内容属于破坏用户回复，改为保留并交给 legacy 结构化。
      const text = texts[0]
      if (!text.trim()) return { ok: false, error: 'persona 内容块为空', texts }
      // 一个块里塞了两个顶层对象时，只按第一个渲染等于静默丢掉后一个，判冲突。
      if (countTopLevelObjects(text) > 1) return { ok: false, error: 'persona 内容块只能有一个 JSON 对象', conflict: true, texts: splitTopLevelObjects(text) }
      return { ok: true, text }
    }

    // 数顶层 JSON 对象个数：只有出现在深度 0、且紧接在上一个对象结束（或文本开头）的 `{`
    // 才算一份新文档；中途错误闭合后尾随的 `"table":{...}` 不算。忽略字符串里的花括号。
    const countTopLevelObjects = (raw) => {
      const source = String(raw ?? '')
      let depth = 0
      let inString = false
      let escaped = false
      let count = 0
      let lastSignificant = ''
      for (let i = 0; i < source.length; i += 1) {
        const ch = source[i]
        if (inString) {
          if (escaped) { escaped = false; continue }
          if (ch === '\\') { escaped = true; continue }
          if (ch === '"') inString = false
          continue
        }
        if (/\s/.test(ch)) continue
        if (ch === '"') { inString = true; lastSignificant = ch; continue }
        if (ch === '{') {
          if (depth === 0 && (lastSignificant === '' || lastSignificant === '}' || lastSignificant === ',')) count += 1
          depth += 1
          lastSignificant = ch
          continue
        }
        if (ch === '}') { depth = Math.max(0, depth - 1); lastSignificant = ch; continue }
        lastSignificant = ch
      }
      return count
    }

    // 把「一个块里写了多个顶层对象」的原文切成逐对象文本，降级时每个对象各自还原，
    // 避免只按第一个渲染而把后面的内容丢掉。
    const splitTopLevelObjects = (raw) => {
      const source = String(raw ?? '')
      const parts = []
      let depth = 0
      let inString = false
      let escaped = false
      let start = -1
      for (let i = 0; i < source.length; i += 1) {
        const ch = source[i]
        if (inString) {
          if (escaped) { escaped = false; continue }
          if (ch === '\\') { escaped = true; continue }
          if (ch === '"') inString = false
          continue
        }
        if (ch === '"') { inString = true; continue }
        if (ch === '{' || ch === '[') {
          if (depth === 0) start = i
          depth += 1
          continue
        }
        if (ch === '}' || ch === ']') {
          depth = Math.max(0, depth - 1)
          if (depth === 0 && start >= 0) {
            parts.push(source.slice(start, i + 1))
            start = -1
          }
        }
      }
      return parts.length > 0 ? parts : [source]
    }

    const makePersonaElement = (doc, tag, className, text) => {
      const element = doc.createElement(tag)
      element.setAttribute(GENERATED_ATTR, '1')
      if (className) element.className = className
      if (text !== undefined) element.textContent = text
      return element
    }

    // 卡片正文里最常见的两种行内 markdown：**粗体** 与 `代码`。卡片是自建 DOM（不走 innerHTML），
    // 模型在 lead / body 里写了标记就会原样露出 ** —— 这里手写最小解析，只认这两种，
    // 其余一律按纯文本处理，既不加 innerHTML 误伤，也让 textContent 天然不带标记（复制是净文本）。
    const fillPersonaText = (doc, element, text) => {
      const source = String(text ?? '')
      if (!source) return element
      if (!/[*`]/.test(source)) {
        element.textContent = source
        return element
      }
      const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
      let last = 0
      for (const match of source.matchAll(pattern)) {
        const token = match[0]
        const at = match.index ?? 0
        if (at > last) element.appendChild(doc.createTextNode(source.slice(last, at)))
        const inline = makePersonaElement(doc, token.startsWith('**') ? 'strong' : 'code')
        // 行内标记不能套卡片标题样式：段落开头的 **粗体** 会被 19px 标题规则命中。
        inline.setAttribute('data-dss-inline', '1')
        inline.textContent = token.startsWith('**') ? token.slice(2, -2) : token.slice(1, -1)
        element.appendChild(inline)
        last = at + token.length
      }
      if (last < source.length) element.appendChild(doc.createTextNode(source.slice(last)))
      return element
    }

    // ===== 卡片级复制（v1.1）=====
    // 五档粒度：结论 / 建议 / 风险 / 表格 / 整条回复。复制内容一律「净内容」：
    // 不带卡标签（结论/建议/风险）、不带身份头、不带开场与收尾签名。
    const CARD_COPY_ATTR = 'data-dsh-card-copy'
    const TABLE_COPY_ATTR = 'data-dsh-table-copy'
    const REPLY_COPY_ATTR = 'data-dsh-reply-copy'

    const copyMark = (button) => {
      if (!button?.setAttribute) return
      button.setAttribute('data-copied', '1')
      try {
        setTimeout(() => button.removeAttribute?.('data-copied'), 1200)
      } catch {
        // 没有定时器时保持已复制态，不阻断。
      }
    }

    const writeClipboard = async (text, button) => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
        copyMark(button)
      } catch {
        // 宿主拒绝剪贴板时不给假反馈。
      }
    }

    const makeCopyButton = (doc, className, ariaLabel, readText, attr, value) => {
      const button = makePersonaElement(doc, 'button', className)
      button.setAttribute('type', 'button')
      button.setAttribute(attr, value)
      button.setAttribute('aria-label', ariaLabel)
      button.setAttribute('title', ariaLabel)
      button.appendChild(makePersonaElement(doc, 'span', 'dss-copy-icon'))
      button.appendChild(makePersonaElement(doc, 'span', 'dss-copy-ok', '✓'))
      button.addEventListener?.('click', (event) => {
        event?.stopPropagation?.()
        void writeClipboard(String(readText() ?? ''), button)
      })
      return button
    }

    // 卡片净文本：跳过标签行与按钮，列表按行摊开，行内换行保留。
    const personaCardPlainText = (card) => {
      const lines = []
      for (const node of card.children ?? []) {
        if (node.nodeType !== 1) continue
        if (node.tagName === 'BUTTON') continue
        if (node === card.firstElementChild && node.firstElementChild?.tagName === 'STRONG') continue
        if (node.tagName === 'OL' || node.tagName === 'UL') {
          let index = 0
          for (const li of node.children ?? []) {
            index += 1
            const marker = node.tagName !== 'OL' ? '- ' : (node.classList?.contains('dss-points') ? String.fromCharCode(64 + index) + '. ' : index + '. ')
            lines.push(marker + (li.textContent ?? '').trim())
          }
          continue
        }
        const text = (node.textContent ?? '').trim()
        if (text) lines.push(text)
      }
      return lines.join('\n')
    }

    // 表格净文本：TSV（制表符分隔），单元格内连续空白折叠成一个空格。
    const personaTableTsv = (table) => {
      const rows = []
      for (const tr of table.querySelectorAll?.('tr') ?? []) {
        const cells = [...(tr.querySelectorAll?.('th,td') ?? [])].map((cell) => {
          const text = (cell.textContent ?? '').replace(/\s+/g, ' ').trim()
          const marker = cell.getAttribute?.('data-dss-row-index') ?? ''
          return marker && text ? marker + ' ' + text : text
        })
        rows.push(cells.join('\t'))
      }
      return rows.join('\n')
    }

    // 整条回复净文本：卡片按净文本展开，表格用 TSV，跳过前缀/收尾/复制条本身。
    const personaReplyPlainText = (markdown) => {
      const parts = []
      for (const node of markdown.children ?? []) {
        if (node.nodeType !== 1) continue
        if (node.matches?.(`[${REPLY_COPY_ATTR}]`)) continue
        if (node.classList?.contains('dss-persona-prefix') || node.classList?.contains('dss-persona-suffix')) continue
        if (node.matches?.('blockquote')) {
          const text = personaCardPlainText(node)
          if (text) parts.push(text)
          continue
        }
        if (node.matches?.('.dss-table-wrap')) {
          const table = node.querySelector?.('table')
          const tsv = table ? personaTableTsv(table) : ''
          if (tsv) parts.push(tsv)
          continue
        }
        const text = (node.textContent ?? '').trim()
        if (text) parts.push(text)
      }
      return parts.join('\n\n')
    }

    const appendPersonaCard = (doc, markdown, label, bodies) => {
      const card = makePersonaElement(doc, 'blockquote')
      const labelParagraph = makePersonaElement(doc, 'p')
      const strong = makePersonaElement(doc, 'strong', '', label)
      labelParagraph.appendChild(strong)
      card.appendChild(labelParagraph)
      for (const body of bodies) card.appendChild(body)
      // 幂等：同一张卡被流式与 MutationObserver 多次渲染时，按钮只插一次。
      if (!card.querySelector?.(`[${CARD_COPY_ATTR}]`)) {
        card.appendChild(makeCopyButton(doc, 'dss-card-copy', '复制' + label, () => personaCardPlainText(card), CARD_COPY_ATTR, label))
      }
      markdown.appendChild(card)
    }

    const renderPersonaContent = (markdown, content, config, envelopeText = null) => {
      clearPersonaPending(markdown)
      const doc = markdown.ownerDocument ?? document
      // 块外内容（模型的自然正文）保留：只摘出 persona 块本身，
      // 插件自己生成的节点（卡片 / 前后缀）不能当作"块外正文"再追加一次。
      // 0.2.2-rc.2 起 fence 外面多包一层 .fenceSeat，只排除直接子级会让 seat 当作
      // "块外正文"原样留下 —— 必须排除「包含 persona 块」或「本身就是 persona 块」的子树。
      // 块外正文要留在原位置：模型常把「先说一句」写在信封前（实机统计 137 / 680 条），
      // 早先一律追加到卡片后面，等于把开场白搬到结尾。按 persona 块在子级里的下标切成前 / 后两组。
      const allChildren = [...(markdown.children ?? [])]
      const personaIndex = allChildren.findIndex((node) => node.matches?.('.md-code-block') || node.querySelector?.('.md-code-block'))
      const isOutsideNode = (node) => {
        if (node.matches?.(`[${GENERATED_ATTR}]`)) return false
        if (node.matches?.('.md-code-block')) return false
        if (node.querySelector?.('.md-code-block')) return false
        return true
      }
      const outsideBefore = personaIndex < 0 ? [] : allChildren.slice(0, personaIndex).filter(isOutsideNode)
      const outsideAfter = (personaIndex < 0 ? allChildren : allChildren.slice(personaIndex + 1)).filter(isOutsideNode)
      while (markdown.firstChild) markdown.removeChild(markdown.firstChild)
      for (const node of outsideBefore) markdown.appendChild(node)
      if (config.prefix) markdown.appendChild(makePersonaElement(doc, 'p', 'dss-persona-prefix', config.prefix))
      if (content.kind === 'short') {
        appendPersonaCard(doc, markdown, '短答', [fillPersonaText(doc, makePersonaElement(doc, 'p'), content.text)])
      } else {
        const conclusionLead = makePersonaElement(doc, 'p')
        conclusionLead.appendChild(fillPersonaText(doc, makePersonaElement(doc, 'strong'), content.conclusion.lead))
        const conclusionBodies = [conclusionLead]
        const points = Array.isArray(content.conclusion.points) ? content.conclusion.points : []
        if (points.length > 0) {
          const list = makePersonaElement(doc, 'ol', 'dss-points')
          for (const point of points) list.appendChild(fillPersonaText(doc, makePersonaElement(doc, 'li'), point))
          conclusionBodies.push(list)
        } else if (content.conclusion.body) {
          conclusionBodies.push(fillPersonaText(doc, makePersonaElement(doc, 'p'), content.conclusion.body))
        }
        appendPersonaCard(doc, markdown, '结论', conclusionBodies)
        if (content.explanation) {
          const explanationBodies = []
          if (content.explanation.analogy) {
            const paragraph = makePersonaElement(doc, 'p')
            paragraph.appendChild(makePersonaElement(doc, 'strong', '', '类比：'))
            paragraph.appendChild(fillPersonaText(doc, makePersonaElement(doc, 'span'), content.explanation.analogy))
            explanationBodies.push(paragraph)
          }
          if (content.explanation.example) {
            const paragraph = makePersonaElement(doc, 'p')
            paragraph.appendChild(makePersonaElement(doc, 'strong', '', '举例：'))
            paragraph.appendChild(fillPersonaText(doc, makePersonaElement(doc, 'span'), content.explanation.example))
            explanationBodies.push(paragraph)
          }
          if (explanationBodies.length > 0) appendPersonaCard(doc, markdown, '讲解', explanationBodies)
        }
        if (content.kind === 'table') {
          const table = makePersonaElement(doc, 'table')
          const thead = makePersonaElement(doc, 'thead')
          const headRow = makePersonaElement(doc, 'tr')
          for (const head of content.table.head) headRow.appendChild(fillPersonaText(doc, makePersonaElement(doc, 'th'), head))
          thead.appendChild(headRow)
          table.appendChild(thead)
          const tbody = makePersonaElement(doc, 'tbody')
          for (const [rowIndex, row] of content.table.rows.entries()) {
            const tr = makePersonaElement(doc, 'tr')
            for (const [cellIndex, cell] of row.entries()) {
              const td = fillPersonaText(doc, makePersonaElement(doc, 'td'), cell)
              if (cellIndex === 0) td.setAttribute('data-dss-row-index', String.fromCharCode(97 + rowIndex))
              tr.appendChild(td)
            }
            tbody.appendChild(tr)
          }
          table.appendChild(tbody)
          const wrap = makePersonaElement(doc, 'div', 'dss-table-wrap')
          wrap.appendChild(makeCopyButton(doc, 'dss-table-copy', '复制表格（制表符分隔）', () => personaTableTsv(table), TABLE_COPY_ATTR, '1'))
          wrap.appendChild(table)
          markdown.appendChild(wrap)
        }
        // 建议 / 风险缺字段时不补空卡：模型少写那段就少一张，结论卡照出。
        if (content.suggestions.length > 0) {
          const list = makePersonaElement(doc, 'ol')
          for (const suggestion of content.suggestions) list.appendChild(fillPersonaText(doc, makePersonaElement(doc, 'li'), suggestion))
          appendPersonaCard(doc, markdown, '建议', [list])
        }
        if (content.risk) appendPersonaCard(doc, markdown, '风险', [fillPersonaText(doc, makePersonaElement(doc, 'p'), content.risk)])
      }
      if (config.innerOsEnabled !== false && content.innerOs) markdown.appendChild(makePersonaElement(doc, 'p', 'dss-persona-suffix', '💭 ' + content.innerOs))
      else if (config.suffix && content.kind === 'normal') markdown.appendChild(makePersonaElement(doc, 'p', 'dss-persona-suffix', config.suffix))
      for (const node of outsideAfter) markdown.appendChild(node)
      // 整条回复复制：放在最后，内容不含身份头 / 开场 / 收尾 / 表格复制按钮。
      if (!markdown.querySelector?.(`[${REPLY_COPY_ATTR}]`)) {
        const bar = makePersonaElement(doc, 'div', 'dss-reply-copy')
        bar.setAttribute(REPLY_COPY_ATTR, '1')
        bar.appendChild(makeCopyButton(doc, 'dss-reply-copy-btn', '复制本条回复', () => personaReplyPlainText(markdown), 'data-dsh-reply-copy-btn', '1'))
        markdown.appendChild(bar)
      }
      markdown.removeAttribute?.(PERSONA_ERROR_ATTR)
      markdown.removeAttribute?.(PERSONA_FALLBACK_ATTR)
      markdown.removeAttribute?.(PERSONA_PENDING_ATTR)
      markdown.setAttribute(PERSONA_KIND_ATTR, content.kind)
      decorateStructured(markdown)
      personaRenderCache.set(markdown, {
        content,
        kind: content.kind,
        envelopeText: envelopeText ?? null,
        envelopeHash: envelopeText === null ? null : personaHash(envelopeText),
        signature: personaContentSignature(content, config),
      })
      return content.kind
    }

    // 畸形 persona JSON 的可读降级：不把原始 JSON 摆给用户，尽量把 lead / body /
    // suggestions / risk 抽出来，按普通段落渲染；抽不到就只留一句提示。
    const salvagePersonaText = (raw) => {
      const text = String(raw ?? '')
      if (!text.trim()) return null
      const unescape = (value) => value
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
      const field = (key) => {
        const pattern = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"')
        const match = pattern.exec(text)
        if (match) return unescape(match[1]).trim()
        // 回复被截断时字符串没有收尾引号：把该键后面的残文本当作内容保留，
        // 总比整段丢掉好（这里只取到行尾/段落尾，不跨字段）。
        const open = new RegExp('"' + key + '"\\s*:\\s*"')
        const head = open.exec(text)
        if (!head) return ''
        const rest = text.slice(head.index + head[0].length)
        const cut = rest.search(/",?\s*"[a-zA-Z]+"\s*:/)
        const tail = cut >= 0 ? rest.slice(0, cut) : rest
        return unescape(tail).replace(/["}\s]+$/, '').trim()
      }
      const lead = field('lead')
      const body = field('body')
      const risk = field('risk')
      const shortText = field('text')
      // 内心OS 与身份头无关：降级抢救也必须保留模型给的合法 innerOs，否则三卡在、💭没了。
      const innerOs = field('innerOs')
      const suggestions = []
      const start = text.indexOf('"suggestions"')
      if (start >= 0) {
        const open = text.indexOf('[', start)
        if (open >= 0) {
          let depth = 1
          let inString = false
          let escaped = false
          let itemStart = -1
          for (let i = open + 1; i < text.length && suggestions.length < 20; i += 1) {
            const ch = text[i]
            if (inString) {
              if (escaped) escaped = false
              else if (ch === '\\') escaped = true
              else if (ch === '"') {
                inString = false
                const value = unescape(text.slice(itemStart, i)).trim()
                if (value) suggestions.push(value)
                itemStart = -1
              }
              continue
            }
            if (ch === '"') { inString = true; itemStart = i + 1; continue }
            if (ch === '[') depth += 1
            if (ch === ']') { depth -= 1; if (depth === 0) break }
          }
          // 数组提前闭合的常见形态：后续项目变成裸字符串 "删除：…","校验：…"，
          // 这里把数组结束后、risk 键之前的裸字符串也收进建议列表。
          let rest = text.indexOf(']', open)
          const riskIndex = text.indexOf('"risk"', open)
          const limit = riskIndex > 0 ? riskIndex : text.length
          while (rest > 0 && rest < limit && suggestions.length < 20) {
            const quote = text.indexOf('"', rest + 1)
            if (quote < 0 || quote > limit) break
            let endQuote = quote + 1
            let esc = false
            for (; endQuote < limit; endQuote += 1) {
              const ch = text[endQuote]
              if (esc) { esc = false; continue }
              if (ch === '\\') { esc = true; continue }
              if (ch === '"') break
            }
            if (endQuote >= limit) break
            const value = unescape(text.slice(quote + 1, endQuote)).trim()
            if (value) suggestions.push(value)
            rest = endQuote
          }
        }
      }
      if (!lead && !body && !risk && !shortText && !innerOs && suggestions.length === 0) return null
      return { lead, body, risk, shortText, suggestions, innerOs: innerOs && innerOs.length <= 30 ? innerOs : '' }
    }

    // 宽松还原：JSON 语法能过、但字段不合合同时（例如 table 里写成 "状态" 而不是 rows），
    // 尽量拼出一份可渲染的 content，避免把整条回复退化成原始 JSON。
    const buildLenientPersona = (raw) => {
      let doc
      try { doc = JSON.parse(repairInnerQuotes(String(raw ?? ''))) } catch { return null }
      if (!personaObject(doc)) return null
      const conclusion = personaObject(doc.conclusion) ? doc.conclusion : {}
      const lead = typeof conclusion.lead === 'string'
        ? conclusion.lead.trim()
        : (typeof doc.lead === 'string' ? doc.lead.trim() : '')
      if (!lead) return null
      const body = typeof conclusion.body === 'string'
        ? conclusion.body
        : (typeof doc.body === 'string' ? doc.body : '')
      const rawPoints = Array.isArray(conclusion.points) ? conclusion.points : (Array.isArray(doc.points) ? doc.points : [])
      const points = rawPoints.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, 4)
      const rawExplanation = personaObject(doc.explanation) ? doc.explanation : (personaObject(conclusion.explanation) ? conclusion.explanation : null)
      const analogy = typeof rawExplanation?.analogy === 'string' ? rawExplanation.analogy.trim() : ''
      const example = typeof rawExplanation?.example === 'string' ? rawExplanation.example.trim() : ''
      const risk = typeof doc.risk === 'string' ? doc.risk.trim() : ''
      const rawInnerOs = typeof doc.innerOs === 'string' ? doc.innerOs.trim() : ''
      const suggestions = Array.isArray(doc.suggestions)
        ? doc.suggestions.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, 20)
        : []
      let table = null
      let droppedTable = false
      const rawTable = personaObject(doc.table) ? doc.table : null
      if (rawTable) {
        const head = Array.isArray(rawTable.head)
          ? rawTable.head.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
          : []
        let rows = Array.isArray(rawTable.rows) && rawTable.rows.every((row) => Array.isArray(row)) ? rawTable.rows : null
        if (!rows) {
          // 模型常把 rows 换成别的键名（"状态" / "数据"），也可能摊平成一条数组。
          // 只扫 head / rows 以外的键，避免把表头自己当成一行数据。
          const arrays = Object.entries(rawTable)
            .filter(([key, value]) => key !== 'head' && key !== 'rows' && Array.isArray(value) && value.length > 0)
            .map(([, value]) => value)
          const nested = arrays.find((value) => value.every((row) => Array.isArray(row)))
          if (nested) rows = nested
          else if (head.length > 0) {
            const flat = arrays.find((value) => value.every((cell) => typeof cell === 'string') && value.length % head.length === 0)
            if (flat) {
              rows = []
              for (let i = 0; i < flat.length; i += head.length) rows.push(flat.slice(i, i + head.length))
            }
          }
        }
        if (head.length >= 2 && rows && rows.length > 0) {
          table = {
            head: head.slice(0, 6),
            rows: rows.map((row) => {
              const cells = row.map((cell) => String(cell ?? ''))
              while (cells.length < head.length) cells.push('')
              return cells.slice(0, head.length)
            }),
          }
        } else {
          droppedTable = true
        }
      }
      return {
        droppedTable,
        content: {
          kind: table ? 'table' : 'normal',
          conclusion: { lead, ...(points.length ? { points } : (body ? { body } : {})) },
          ...(analogy || example ? { explanation: { ...(analogy ? { analogy } : {}), ...(example ? { example } : {}) } } : {}),
          suggestions: suggestions.length ? suggestions : ['（本条回复未给出建议）'],
          risk: risk || '（本条回复未给出风险说明）',
          // 宽松还原同样保留合法 innerOs（≤30 字），与身份头开关无关。
          ...(rawInnerOs && rawInnerOs.length <= 30 ? { innerOs: rawInnerOs } : {}),
          ...(table ? { table } : {}),
        },
      }
    }

    // 唯一的降级出口：先把每个 persona 块宽松还原成可读内容，
    // 能出卡就出卡，出不了卡就退普通段落；任何情况下都不把原始 JSON 摊给用户。
    const personaSourceTexts = (markdown) => {
      const blocks = [...(markdown.querySelectorAll?.('.md-code-block') ?? [])]
      return blocks
        .filter((code) => bannerLanguage(code) === 'persona'
          || looksLikePersonaEnvelope(code.querySelector?.('pre')?.textContent ?? '')
          || /"version"\s*:/.test(code.textContent ?? ''))
        .map((code) => code.querySelector('pre')?.textContent ?? '')
    }
    const isPersonaCodeBlock = (block) => bannerLanguage(block) === 'persona'
      || looksLikePersonaEnvelope(block.querySelector?.('pre')?.textContent ?? '')
      || /"version"\s*:/.test(block.textContent ?? '')
    const appendPersonaNote = (doc, markdown, text) => {
      const present = [...(markdown.querySelectorAll?.(`[${GENERATED_ATTR}]`) ?? [])]
      if (present.some((node) => (node.textContent ?? '') === text)) return
      markdown.appendChild(makePersonaElement(doc, 'p', 'dss-persona-note', text))
    }
    const appendSalvagedParagraphs = (doc, markdown, salvaged) => {
      const paragraph = (value) => {
        if (!value) return
        markdown.appendChild(makePersonaElement(doc, 'p'))
      }
      if (salvaged.shortText) {
        markdown.appendChild(makePersonaElement(doc, 'p', '', salvaged.shortText))
      }
      if (salvaged.lead) {
        const node = makePersonaElement(doc, 'p')
        node.appendChild(makePersonaElement(doc, 'strong', '', salvaged.lead))
        markdown.appendChild(node)
      }
      if (salvaged.body) markdown.appendChild(makePersonaElement(doc, 'p', '', salvaged.body))
      if (Array.isArray(salvaged.suggestions) && salvaged.suggestions.length) {
        const list = makePersonaElement(doc, 'ol')
        for (const item of salvaged.suggestions) list.appendChild(makePersonaElement(doc, 'li', '', item))
        markdown.appendChild(list)
      }
      if (salvaged.risk) markdown.appendChild(makePersonaElement(doc, 'p', '', '风险：' + salvaged.risk))
      void paragraph
    }
    const renderPersonaError = (markdown, message, sourceText, options = {}) => {
      clearPersonaPending(markdown)
      console.warn('[dsh-structured] persona 未按合同渲染，已降级：' + message)
      const doc = markdown.ownerDocument ?? document
      const blockTexts = personaSourceTexts(markdown)
      const raws = (Array.isArray(options.texts) && options.texts.length ? options.texts : blockTexts.length ? blockTexts : [String(sourceText ?? '')])
        .map((text) => String(text ?? ''))
        .filter((text) => text.trim().length > 0)
      const contents = []
      const partials = []
      let droppedTable = false
      for (const raw of raws) {
        const salvaged = salvagePersonaText(repairInnerQuotes(raw))
        const lenient = buildLenientPersona(raw)
        if (lenient && lenient.content && lenient.content.conclusion.lead) {
          const base = lenient.content
          const placeholder = (value) => typeof value === 'string' && value.startsWith('（本条回复未给出')
          const lead = base.conclusion.lead || salvaged?.lead || ''
          const body = base.conclusion.body || salvaged?.body || ''
          const risk = placeholder(base.risk) ? (salvaged?.risk || base.risk) : base.risk
          const suggestions = placeholder(base.suggestions[0])
            ? (salvaged?.suggestions?.length ? salvaged.suggestions : base.suggestions)
            : base.suggestions
          const points = Array.isArray(base.conclusion.points) ? base.conclusion.points : []
          contents.push({
            ...base,
            conclusion: { lead, ...(points.length ? { points } : (body ? { body } : {})) },
            suggestions,
            risk,
          })
          if (lenient.droppedTable) droppedTable = true
          continue
        }
        if (salvaged && salvaged.lead && salvaged.suggestions.length && salvaged.risk) {
          contents.push({
            kind: 'normal',
            conclusion: { lead: salvaged.lead, ...(salvaged.body ? { body: salvaged.body } : {}) },
            suggestions: salvaged.suggestions,
            risk: salvaged.risk,
            ...(salvaged.innerOs ? { innerOs: salvaged.innerOs } : {}),
          })
        } else if (salvaged) {
          partials.push(salvaged)
        }
      }
      for (const block of [...(markdown.querySelectorAll?.('.md-code-block') ?? [])]) {
        if (isPersonaCodeBlock(block)) {
          // rc.2 的 fenceSeat 包裹层一并移除，避免留下空 seat 盒子。
          const seat = block.parentElement
          block.remove()
          if (seat?.matches?.('[class*="_fenceSeat"]') && !seat.firstElementChild) seat.remove()
        }
      }
      const flow = findFlowScope(markdown).assistant ?? null
      mountPersonaHead(flow, personaModeState)
      if (contents.length > 0) {
        const kind = renderPersonaContent(markdown, contents[0], personaModeState, raws[0] ?? null)
        for (const extra of contents.slice(1)) {
          appendSalvagedParagraphs(doc, markdown, {
            lead: extra.conclusion.lead,
            body: extra.conclusion.body ?? '',
            suggestions: extra.suggestions ?? [],
            risk: extra.risk ?? '',
          })
        }
        for (const partial of partials) appendSalvagedParagraphs(doc, markdown, partial)
        if (contents.length > 1) appendPersonaNote(doc, markdown, '（本条回复写了多个 persona 内容块，已按第一个出卡，其余按正文展开）')
        if (droppedTable) appendPersonaNote(doc, markdown, '（表格字段不合合同，未能渲染，已按正文展示）')
        return kind
      }
      for (const partial of partials) appendSalvagedParagraphs(doc, markdown, partial)
      if (partials.length === 0) {
        // 什么字段都救不出来（例如只写了 {"version":1,"kind":"text"}）：给一句能看懂的说明，
        // 但不把原始 JSON 摊给用户（既有验收：原始 JSON 不得出现在界面上）。
        let reason = ''
        try {
          const parsed = JSON.parse(String(raws[0] ?? '').trim())
          if (parsed && typeof parsed === 'object' && typeof parsed.kind === 'string' && !['normal', 'short', 'table'].includes(parsed.kind)) {
            reason = 'kind「' + parsed.kind + '」不在合同内'
          }
        } catch {
          // 解析不出就不点具体原因。
        }
        appendPersonaNote(doc, markdown, reason
          ? '（本条回复只给了 persona 头部，' + reason + '，没有可展示的正文）'
          : '（本条回复的格式未按合同，已按原文展开）')
      }
      markdown.removeAttribute?.(PERSONA_ERROR_ATTR)
      markdown.removeAttribute?.(PERSONA_FALLBACK_ATTR)
      markdown.removeAttribute?.(PERSONA_PENDING_ATTR)
      markdown.setAttribute(PERSONA_KIND_ATTR, 'legacy')
      personaRenderCache.delete(markdown)
      decorateStructured(markdown)
      return 'legacy'
    }

    const dropPersonaHead = (flow) => {
      for (const head of flow?.querySelectorAll?.(`[${PERSONA_HEAD_ATTR}]`) ?? []) head.remove()
    }

    const renderPersonaMarkdown = (markdown, config, flowOverride, options = {}) => {
      if (!config?.enabled && options.force !== true) return null
      const scope = findFlowScope(markdown, flowOverride)
      if (scope.userLike) {
        decorateStructured(markdown)
        return 'user'
      }
      if (scope.skip) {
        decorateStructured(markdown)
        return 'skip'
      }
      if (scope.external) {
        // 非会话界面的 markdown（插件设置页 / 市场详情页 / 文档预览）不是模型回复：
        // 不套内容合同、不挂身份头，更不能把内部诊断当成错误卡弹给用户。
        // 只看视觉层，内容原样保留。
        decorateStructured(markdown)
        personaRenderCache.delete(markdown)
        return 'external'
      }
      const flow = scope.assistant
      // 身份头关闭：本回合正文照常出卡，只摘掉头像 / 名字 / 签名。
      if (config.headEnabled === false) dropPersonaHead(flow)
      // 会话内但定位不到 assistant 容器：fail-open 走 legacy 排版，不把内部诊断暴露给用户。
      markdown.removeAttribute?.(PERSONA_FALLBACK_ATTR)
      const diff = inDiff(markdown) || Boolean(markdown.querySelector?.('.md-diff, [data-diff], [class*="diff"]'))
      const errorReply = Boolean(markdown.closest?.('[data-error], [data-status="error"], [data-severity="error"]')) || Boolean(markdown.querySelector?.('[data-error], .md-error'))
      if (diff || errorReply) {
        clearPersonaPending(markdown)
        dropPersonaHead(flow)
        const kind = diff ? 'diff' : 'exception'
        markdown.removeAttribute?.(PERSONA_ERROR_ATTR)
        markdown.removeAttribute?.(PERSONA_PENDING_ATTR)
        markdown.setAttribute(PERSONA_KIND_ATTR, kind)
        decorateStructured(markdown)
        personaRenderCache.delete(markdown)
        return kind
      }
      const genui = inGenui(markdown) || Boolean(markdown.querySelector?.('[data-genui], [class*="genui-root"]'))
      if (genui) {
        clearPersonaPending(markdown)
        dropPersonaHead(flow)
        markdown.removeAttribute?.(PERSONA_ERROR_ATTR)
        markdown.removeAttribute?.(PERSONA_PENDING_ATTR)
        markdown.setAttribute(PERSONA_KIND_ATTR, 'genui')
        decorateStructured(markdown)
        personaRenderCache.delete(markdown)
        return 'genui'
      }
      // 裸信封：模型不包围栏直接把 JSON 写进正文。从严识别（三特征键 + 可过合同校验），
      // 命中即按合同渲染并移除裸 JSON 段落；不命中保持 legacy，不影响普通回复。
      const bareText = barePersonaEnvelopeText(markdown)
      if (bareText) {
        const bareValidated = validatePersonaContent(JSON.parse(bareText))
        if (bareValidated.ok) {
          removeBareEnvelopeNodes(markdown, bareText)
          mountPersonaHead(flow, config)
          console.warn('[dsh-structured] persona JSON 未包围栏，已按裸信封还原为卡片')
          return renderPersonaContent(markdown, bareValidated.content, config, bareText)
        }
      }
      const envelope = extractPersonaEnvelope(markdown)
      if (envelope.kind === 'none') {
        const cached = personaRenderCache.get(markdown)
        if (cached) {
          // 渲染后的 DOM 已没有 envelope；用原始 envelope 文本/哈希和配置签名做幂等判断。
          clearPersonaPending(markdown)
          mountPersonaHead(flow, config)
          if (markdown.getAttribute(PERSONA_KIND_ATTR) === cached.kind && personaContentSignature(cached.content, config) === cached.signature) return cached.kind
          return renderPersonaContent(markdown, cached.content, config, cached.envelopeText)
        }
        if (markdown.getAttribute(PERSONA_ERROR_ATTR) === '1') return 'error'
        if (markdown.getAttribute(PERSONA_PENDING_ATTR) === '1') return 'pending'
        if (isLegacyPersonaMarkdown(markdown, flow)) {
          dropPersonaHead(flow)
          return 'legacy'
        }
        // 没有 persona 信封的消息（工具步骤中间叙述 / 普通回复）不挂身份头：
        // 头像只属于真正的 persona 回复，否则看起来像人格回复却没有卡片。
        dropPersonaHead(flow)
        if (markdown.querySelector?.('.md-code-block')) {
          clearPersonaPending(markdown)
          markdown.removeAttribute?.(PERSONA_ERROR_ATTR)
          markdown.setAttribute(PERSONA_KIND_ATTR, 'code')
          decorateStructured(markdown)
          return 'code'
        }
        // 普通回复/旧格式没有 persona 块：保留原文，走 legacy 排版；只有块存在但非法才 error。
        markdown.removeAttribute?.(PERSONA_ERROR_ATTR)
        markdown.removeAttribute?.(PERSONA_PENDING_ATTR)
        decorateStructured(markdown)
        return 'legacy'
      }
      if (!envelope.ok) return renderPersonaError(markdown, envelope.error, envelope.text, { texts: envelope.texts })
      let parsed
      const rawText = envelope.text
      try {
        parsed = JSON.parse(rawText)
      } catch (error) {
        // 模型或传输可能带入不可见字符（ZWSP / NBSP / BOM 等）：JSON 本身合法时先剥掉再试，
        // 不因为一个不可见字符把整条回复判死。
        const cleaned = stripInvisibleJsonChars(rawText)
        const candidates = []
        if (cleaned !== rawText) candidates.push(cleaned)
        // 信封写短了（少一层 }、字符串没收尾）：补闭合括号后按正常信封渲染，
        // 不因为一次截断把整条回复降级成普通文字。
        const truncated = balanceTruncatedJson(cleaned)
        if (truncated) candidates.push(truncated)
        // table.rows 漏键（head 后直接跟行数组）：补键后再试一次。
        const rowsRepaired = repairMissingRowsKey(cleaned)
        if (rowsRepaired) {
          candidates.push(rowsRepaired)
          // 修复后可能仍有短行（某行少写一列）：补空单元格也算可渲染。
          try {
            const padded = padShortTableRows(JSON.parse(rowsRepaired))
            if (padded) candidates.push(JSON.stringify(padded))
          } catch {}
        }
        // 位置截断类失败（Unexpected non-whitespace character after JSON at position N）：
        // 常见根因是模型把闭合括号多写了一遍（session-839e98db：len=834、前 833 字符为合法 JSON）。
        // 对这类「JSON 合法 + 结尾多余字符」做截断与去尾 } 的候选尝试，命中即按正常信封渲染。
        const message = String(error.message ?? error)
        const positionMatch = message.match(/Unexpected non-whitespace character after JSON at position (\d+)/)
        if (positionMatch) {
          const pos = Number(positionMatch[1])
          const base = (cleaned !== rawText ? cleaned : rawText)
          if (Number.isFinite(pos) && pos > 0 && pos <= base.length) {
            candidates.push(base.slice(0, pos))
            candidates.push(base.slice(0, pos).replace(/\s+$/, ''))
          }
          for (let drop = 1; drop <= 3; drop++) {
            const trimmedEnd = base.replace(/\s+$/, '')
            if (trimmedEnd.endsWith('}')) candidates.push(trimmedEnd.slice(0, -drop))
          }
          // 中途闭合类：模型把根对象提前关掉（body 后面多一个 }），后续 table / suggestions / risk
          // 变成尾随内容。解析在 position 处停下时，尝试删掉该位置附近的一个 } 再解析。
          for (const at of [pos - 1, pos, pos - 2]) {
            if (at < 0 || at >= base.length) continue
            if (base[at] !== '}') continue
            candidates.push(base.slice(0, at) + base.slice(at + 1))
          }
        }
        // 内层引号转义放在结构修复之后：位置型错误（根对象提前闭合）必须先删错位的 }，
        // 否则引号候选会把 "},"body":" 当成引号内容吞进 lead，渲染出 JSON 残片。
        // 中文里直接写 ASCII 双引号（"这份"低"不是系统的功劳"）会让 JSON 断在第一个内层引号上，
        // 解析失败后抢救出的字段都只剩半句。这里按结构判断内层引号并转义，作为结构修复失败后的兜底。
        // 内层引号后面紧邻 ASCII , ] } 时单次判定会误当收尾（`"他说"好",然后走了"`），
        // 所以走候选搜索：默认判定不成时再逐步把可疑引号改成内容引号。
        const quoteBase = (cleaned !== rawText ? cleaned : rawText)
        for (const variant of quoteRepairCandidates(quoteBase)) candidates.push(variant.candidate)
        let repaired = null
        let repairedContent = null
        for (const candidate of candidates) {
          try {
            const candidateParsed = normalizePersonaObject(JSON.parse(candidate))
            const candidateValidation = validatePersonaContent(candidateParsed)
            if (candidateValidation.ok) { repaired = candidateParsed; repairedContent = candidateValidation.content; break }
          } catch {}
        }
        // 只有「补齐闭合括号」这一种修复允许缺字段（信封写短了）：其它畸形形状仍走抢救降级，
        // 否则会把本来能救回三张卡的 payload 判成两卡。
        if (!repaired && truncated) {
          try {
            const candidateParsed = normalizePersonaObject(JSON.parse(truncated))
            const lenient = validatePersonaContent(candidateParsed, { lenient: true })
            if (lenient.ok) { repaired = candidateParsed; repairedContent = lenient.content }
          } catch {}
        }
        if (repaired) {
          // 流式期间不抢先出卡：半截信封补括号后也能解析，若此刻渲染，卡片会随每个 token
          // 重排好几次（结论卡先出、再被建议 / 风险卡挤）。等宿主完成信号消失后再渲染。
          if (personaIsStreaming(markdown)) return schedulePersonaError(markdown, 'persona JSON 解析失败：' + message, rawText, true)
          console.warn('[dsh-structured] persona JSON 已修正畸形括号后渲染：' + message)
          mountPersonaHead(flow, config)
          return renderPersonaContent(markdown, repairedContent, config, envelope.text)
        } else {
          return schedulePersonaError(markdown, 'persona JSON 解析失败：' + message, rawText, true)
        }
      }
      const validated = validatePersonaContent(parsed)
      if (!validated.ok) return schedulePersonaError(markdown, validated.error, envelope.text, false)
      mountPersonaHead(flow, config)
      return renderPersonaContent(markdown, validated.content, config, envelope.text)
    }

    function decorateStructured(root) {
      markScopes(root)
      for (const heading of root.querySelectorAll('[class*="_markdown_"] h2, [class*="_markdown_"] h3')) {
        if (inGenui(heading) || inDiff(heading)) continue
        const icon = iconFor((heading.textContent ?? '').trim())
        if (icon === null) heading.removeAttribute(ICON_ATTR)
        else heading.setAttribute(ICON_ATTR, icon)
      }

      for (const block of root.querySelectorAll('blockquote')) {
        if (inGenui(block) || inDiff(block)) continue
        let type = cardTypeFor(block)
        if (type === null && isStatementCard(block)) type = 'statement'
        if (type === null) {
          block.removeAttribute(CARD_ATTR)
          block.removeAttribute(CARD_TYPE_ATTR)
          block.removeAttribute(LEAD_ATTR)
          block.removeAttribute(TONE_ATTR)
          setCardClass(block, null)
          continue
        }
        block.setAttribute(CARD_ATTR, '1')
        block.setAttribute(CARD_TYPE_ATTR, type)
        block.removeAttribute(LEAD_ATTR)
        block.setAttribute(TONE_ATTR, type === 'risk' ? 'warn' : type === 'accept' ? 'success' : 'info')
        setCardClass(block, type)
        if (type !== 'statement') {
          const label = labelOf(block)
          const strong = firstParagraph(block)?.firstElementChild
          // 同理不改 React 文本节点：标签只写属性，标题条继续显示模型原文。
          if (label && strong?.tagName === 'STRONG') strong.setAttribute?.(CARD_LABEL_ATTR, label)
        }
      }

      // 兜底：模型把首段写成普通加粗段落（不是引用块）时，直接给这段上卡片样式，
      // 避免整条回复「没有卡片」。只在整段没有任何引用块时生效，避免误伤正常卡片。
      for (const markdown of root.querySelectorAll?.('[class*="_markdown_"]') ?? []) {
        if (inGenui(markdown) || inDiff(markdown) || markdown.querySelector('blockquote, table, [class*="_codeBlock"], .md-code-block')) continue
        const first = markdown.firstElementChild
        if (!first || first.tagName !== 'P' || first.childElementCount !== 1) continue
        const strong = first.firstElementChild
        if (!strong || strong.tagName !== 'STRONG') continue
        const text = (strong.textContent ?? '').trim()
        if (!text || text.length > 120) continue
        first.classList?.add?.('dss-card', 'dss-card-statement')
        first.setAttribute(CARD_ATTR, '1')
        first.setAttribute(CARD_TYPE_ATTR, 'statement')
        first.setAttribute(TONE_ATTR, 'info')
      }

      for (const element of root.querySelectorAll('[class*="_markdown_"] p, [class*="_markdown_"] li')) {
        if (inGenui(element) || inDiff(element) || element.closest('blockquote, table')) {
          element.removeAttribute(STATUS_ATTR)
          continue
        }
        const status = statusFor((element.textContent ?? '').trimStart())
        if (status === null) element.removeAttribute(STATUS_ATTR)
        else element.setAttribute(STATUS_ATTR, status)
      }

      for (const table of root.querySelectorAll('[class*="_markdown_"] table')) {
        if (inGenui(table)) {
          table.removeAttribute(SKIP_ATTR)
          table.removeAttribute(STATUS_TABLE_ATTR)
          table.removeAttribute(COL_ATTR)
          table.removeAttribute(TAIL_ATTR)
          toggleClass(table, 'dss-table', false)
          continue
        }
        if (inDiff(table)) {
          table.setAttribute(SKIP_ATTR, 'table')
          table.removeAttribute(STATUS_TABLE_ATTR)
          toggleClass(table, 'dss-table', false)
          continue
        }
        table.removeAttribute(SKIP_ATTR)
        toggleClass(table, 'dss-table', true)
        const columnCount = table.querySelectorAll?.('thead th')?.length ?? 0
        if (columnCount > 0) table.setAttribute(COLS_ATTR, String(columnCount))
        else table.removeAttribute(COLS_ATTR)
        const rows = [...table.querySelectorAll('tbody tr')]
        const tableStreaming = Boolean(table.closest?.('[data-streaming], [data-chat-running], [aria-busy="true"], [data-state="running"]'))
        if (!tableStreaming) {
          const headerCells = [...(table.querySelectorAll?.('thead th') ?? [])]
          const bodyCells = rows.map((row) => (row.cells && row.cells.length ? [...row.cells] : [...(row.querySelectorAll?.('td,th') ?? [])]))
          const columnTotal = Math.max(columnCount, headerCells.length, ...bodyCells.map((cells) => cells.length))
          const widths = []
          for (let index = 0; index < columnTotal; index += 1) {
            let max = 0
            for (const cell of [headerCells[index], ...bodyCells.map((cells) => cells[index])]) {
              if (!cell) continue
              max = Math.max(max, displayUnits((cell.textContent ?? '').trim()))
            }
            widths.push(max)
          }
          const narrow = widths.map((width) => width > 0 && width <= 12)
          for (let index = 0; index < columnTotal; index += 1) {
            for (const cell of [headerCells[index], ...bodyCells.map((cells) => cells[index])]) {
              if (!cell) continue
              if (!cell.setAttribute) continue
              if (narrow[index]) cell.setAttribute(COL_ATTR, COL_NARROW)
              else cell.removeAttribute(COL_ATTR)
            }
          }
          const last = columnTotal - 1
          const middle = widths.slice(1, last)
          const middleMax = middle.length > 0 ? Math.max(...middle) : 0
          const tailCapped = columnTotal >= 3 && !narrow[last] && middleMax >= widths[last] + 6
          if (tailCapped) table.setAttribute(TAIL_ATTR, 'capped')
          else table.removeAttribute(TAIL_ATTR)
        }
        let statusTable = rows.length > 0
        for (const row of rows) {
          if (row.closest?.('thead') || row.closest?.(`[${SKIP_ATTR}="table"]`)) {
            row.removeAttribute(ROW_ATTR)
            statusTable = false
            continue
          }
          const cells = row.cells && row.cells.length
            ? [...row.cells]
            : [...(row.querySelectorAll?.('td,th') ?? [])]
          let status = null
          let statusCell = null
          for (const cell of cells) {
            const candidate = statusFor((cell.textContent ?? '').trimStart())
            if (candidate !== null) {
              status = candidate
              statusCell = cell
              break
            }
          }
          if (status === null) {
            const previous = row.getAttribute?.(ROW_ATTR)
            if (previous) {
              status = previous
              statusCell = cells.find((cell) => cell.getAttribute?.(STATUS_CELL_ATTR)) ?? null
            }
          }
          for (const cell of cells) {
            if (cell === statusCell) continue
            cell.removeAttribute?.(STATUS_CELL_ATTR)
            const pill = typeof cell.querySelector === 'function' ? cell.querySelector(`[${STATUS_PILL_ATTR}]`) : null
            pill?.remove?.()
          }
          if (status === null) {
            row.removeAttribute(ROW_ATTR)
            statusTable = false
          } else {
            row.setAttribute(ROW_ATTR, status)
            markStatusCell(statusCell, status)
          }
        }
        if (statusTable) table.setAttribute(STATUS_TABLE_ATTR, '1')
        else table.removeAttribute(STATUS_TABLE_ATTR)
      }

      for (const paragraph of root.querySelectorAll('[class*="_markdown_"] p')) {
        if (inGenui(paragraph) || inDiff(paragraph) || paragraph.closest('blockquote, table')) {
          paragraph.removeAttribute(LEAD_ATTR)
          continue
        }
        if (/^表格结论/.test((paragraph.textContent ?? '').trimStart())) paragraph.setAttribute(LEAD_ATTR, 'table')
        else paragraph.removeAttribute(LEAD_ATTR)
      }

      for (const code of root.querySelectorAll('[class*="_markdown_"] .md-code-block')) {
        if (inGenui(code)) {
          code.removeAttribute(LANG_ATTR)
          code.removeAttribute(CODE_ATTR)
          code.removeAttribute(SKIP_ATTR)
          toggleClass(code, 'dss-code', false)
          continue
        }
        if (inDiff(code) || isDiffCode(code)) {
          code.removeAttribute(LANG_ATTR)
          code.removeAttribute(CODE_ATTR)
          code.setAttribute(SKIP_ATTR, 'code')
          toggleClass(code, 'dss-code', false)
          continue
        }
        code.removeAttribute(SKIP_ATTR)
        code.setAttribute(CODE_ATTR, '1')
        toggleClass(code, 'dss-code', true)
        const lang = bannerLanguage(code)
        if (lang.length === 0) code.removeAttribute(LANG_ATTR)
        else code.setAttribute(LANG_ATTR, lang)
        ensureCodeCopy(code)
      }
    }


    // 关闭人格后仍渲染 persona 内容块：只出卡片，不挂身份头/前后缀。
    // 模型在关闭后仍可能沿用旧合同发信封；不能把 JSON 原样摊成代码块。
    const renderDisabledPersonaContent = (markdown, config) => {
      const scope = findFlowScope(markdown)
      if (!scope.assistant || scope.userLike || scope.skip || scope.external) return false
      const envelope = extractPersonaEnvelope(markdown)
      if (envelope.kind === 'none' || !envelope.ok) return false
      let parsed
      try { parsed = JSON.parse(envelope.text) } catch { return false }
      const validated = validatePersonaContent(parsed)
      if (!validated.ok) return false
      const contentConfig = { ...config, enabled: true, innerOsEnabled: false, prefix: '', suffix: '' }
      renderPersonaContent(markdown, validated.content, contentConfig, envelope.text)
      markdown.removeAttribute?.(PERSONA_KIND_ATTR)
      markdown.setAttribute?.('data-dsh-persona-content-only', '1')
      return true
    }

    // Actual replies and the settings preview both run through this same
    // structural decorator; the preview only differs in its host container.
    function decorate(root, options = {}) {
      if (personaModeState.pluginEnabled === false) return
      markScopes(root)
      const managedOnly = options.managedOnly === true
      const markdowns = root?.matches?.('[class*="_markdown_"]')
        ? [root]
        : [...(root?.querySelectorAll?.('[class*="_markdown_"]') ?? [])]
      if (!personaModeState.enabled) {
        removePersonaHeads(root)
        if (managedOnly) {
          // 配置变化/关闭：只清理 persona 受管消息，旧历史保持不变。
          for (const markdown of markdowns) if (isPersonaManaged(markdown)) cleanPersonaMarkdown(markdown)
          return
        }
        for (const markdown of markdowns) renderDisabledPersonaContent(markdown, personaModeState)
        decorateStructured(root)
        return
      }
      for (const markdown of markdowns) {
        if (managedOnly && !isPersonaManaged(markdown)) continue
        renderPersonaMarkdown(markdown, personaModeState, undefined, options)
      }
    }

    /**
     * 在插件板块的插件详情页注册配置区（plugins.bundle.config，键 = 包名）。
     * 宿主不会从 Config schema 自动生成表单——配置页必须由插件自己的浏览器半侧注册；
     * 宿主 describe 未服务本命名空间（whileServed 不触发）或 primitives 缺失时不出配置页，
     * 且任何失败都不影响视觉层与消息渲染。
     */
    function setupConfigPage(child, form) {
      if (typeof require !== 'function') return
      if (typeof child?.configForms?.whileServed !== 'function') return
      if (typeof child?.slots?.inject !== 'function' || typeof child?.slots?.register !== 'function') return
      if (typeof form?.set !== 'function') return
      // 旧宿主/直连 setup 的测试可显式传 child.locale；apply 里的注入优先。
      if (child?.locale && typeof child.locale.getSnapshot === 'function' && localeService !== child.locale) localeService = child.locale
      let jsx
      let jsxs
      let ui
      let react
      try {
        const runtime = require('react/jsx-runtime')
        jsx = runtime.jsx
        jsxs = runtime.jsxs
        react = require('react')
        ui = require('@deepseek-ai/dsh-client-ui-primitives')
        if (typeof ui?.Switch !== 'function' || typeof ui?.SegmentedControl !== 'function') return
        if (typeof react?.useState !== 'function') return
      } catch {
        // primitives 不可用（非 desktop 表层）：不出配置页。
        return
      }

      const noteStyle = { fontSize: '12.5px', lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary, inherit)', margin: '6px 0 2px' }

      const fieldValue = (value, spec) => {
        const raw = value?.[spec.field]
        if (raw && typeof raw.get === 'function') return raw.get()
        return raw === undefined || raw === null ? spec.fallback : raw
      }

      const byteLength = (text) => new TextEncoder().encode(text).length
      const TONE_SCHEMA = 'dsh-structured/tone@1'
      const TONE_SKIP_DEFAULT = ['code', 'diff', 'error', 'short', 'table']
      const TONE_MAX = 64 * 1024
      const isToneObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
      const toneString = (value, max) => typeof value === 'string' && value.length <= max
      const emptyTone = () => ({ schema: TONE_SCHEMA, prefix: 'Boss，', style: '像朋友说话，口语化；保持简洁。', suffix: '', skipIn: [...TONE_SKIP_DEFAULT] })
      const cloneTone = (doc) => JSON.parse(JSON.stringify(doc))
      const toneJson = (doc) => JSON.stringify(doc, null, 2)
      const parseToneJson = (text) => {
        if (typeof text !== 'string' || text.trim() === '') return { ok: false, error: t('tone.emptyJson'), pointer: '/' }
        if (byteLength(text) > TONE_MAX) return { ok: false, error: t('tone.tooLarge'), pointer: '/' }
        let doc
        try { doc = JSON.parse(text) } catch (error) { return { ok: false, error: t('tone.parseFailed', { message: String(error.message ?? error) }), pointer: '/' } }
        if (!isToneObject(doc)) return { ok: false, error: t('tone.notObject'), pointer: '/' }
        if (doc.schema !== TONE_SCHEMA) return { ok: false, error: t('tone.schema', { schema: TONE_SCHEMA }), pointer: '/schema' }
        const unknown = Object.keys(doc).filter((key) => !['schema', 'prefix', 'style', 'suffix', 'skipIn', 'userName', 'selfName'].includes(key))
        if (unknown.length) return { ok: false, error: t('tone.unknownField'), pointer: '/' + unknown[0] }
        if (!toneString(doc.prefix, 80)) return { ok: false, error: t('tone.prefix'), pointer: '/prefix' }
        if (!toneString(doc.style, 1200) || doc.style.trim() === '') return { ok: false, error: t('tone.style'), pointer: '/style' }
        if (!toneString(doc.suffix, 80)) return { ok: false, error: t('tone.suffix'), pointer: '/suffix' }
        if (doc.userName !== undefined && !toneString(doc.userName, 20)) return { ok: false, error: t('tone.userName'), pointer: '/userName' }
        if (doc.selfName !== undefined && !toneString(doc.selfName, 20)) return { ok: false, error: t('tone.selfName'), pointer: '/selfName' }
        if (doc.skipIn !== undefined && (!Array.isArray(doc.skipIn) || doc.skipIn.length > 5 || new Set(doc.skipIn).size !== doc.skipIn.length || !doc.skipIn.every((item) => TONE_SKIP_DEFAULT.includes(item)))) return { ok: false, error: t('tone.skipIn'), pointer: '/skipIn' }
        return { ok: true, doc }
      }
      const isLegacyToneText = (text) => {
        try {
          const doc = JSON.parse(text)
          if (!isToneObject(doc)) return false
          return doc.schema === 'dsh-structured/persona@1' || ['meta', 'identity', 'address', 'tone', 'habits', 'closing', 'examples', 'render'].some((key) => key in doc)
        } catch {
          return false
        }
      }
      const describeInvalidTone = (text, parsed) => {
        if (isLegacyToneText(text)) return t('tone.legacy')
        return parsed.error + ' (' + parsed.pointer + ')'
      }
      const statusLabels = {
        off: '已关闭', saved: '已保存，全局生效（新消息使用）', dirty: '', saving: '保存中',
        savedOff: '已保存，未启用', draftOff: '', failed: '保存失败', importInvalid: 'JSON 无效', tooLarge: '超过 64KB', readonly: '只读',
      }
      const statusKeys = {
        off: 'status.off', saved: 'status.saved', saving: 'status.saving', savedOff: 'status.savedOff',
        failed: 'status.failed', importInvalid: 'status.importInvalid', tooLarge: 'status.tooLarge', readonly: 'status.readonly',
      }
      const statusTextFor = (status) => (statusKeys[status] ? t(statusKeys[status]) : '')
      const personaUiFlags = ({ status, writable = true, mode = 'basic' }) => {
        const busy = status === 'saving'
        const invalid = status === 'importInvalid' || status === 'tooLarge'
        const readonly = writable === false
        const dirty = ['dirty', 'draftOff', 'failed'].includes(status)
        return {
          busy, invalid, readonly, dirty,
          formLocked: readonly || busy || invalid,
          canSave: !readonly && !busy && !invalid && dirty,
          canBasic: !invalid,
          mode,
        }
      }

      const EMOJIS = ['🐳', '💗', '🐟', '🌊', '😄', '😎', '🥹', '🤔', '✨', '🔥', '🚀', '💡', '📌', '✅', '⚠️', '🎯', '🧠', '🛠️', '📊', '🌎', '🌙', '☕', '🍚', '🐋', '🫧', '💙', '🙌', '👀', '😤', '😭', '🤝', '💬', '😀', '😂', '🤣', '😊', '😍', '🥰', '😉', '🤗', '🤭', '😴', '😮', '😲', '🥳', '🤯', '😇', '🙃', '👍', '👎', '👌', '✌️', '🤞', '👏', '🙏', '💪', '⚡', '🎉', '❤️', '💜', '🍀', '🌈', '📢', '📝']
      const TEMPLATE_KEY = 'dsh-structured.tone.v5.templates'
      const readTemplateState = () => {
        try {
          const storage = typeof window !== 'undefined' ? window.localStorage : null
          const parsed = JSON.parse(storage?.getItem(TEMPLATE_KEY) ?? 'null')
          if (parsed && Array.isArray(parsed.deletedIds) && Array.isArray(parsed.customs)) return parsed
        } catch {}
        return { deletedIds: [], customs: [] }
      }
      const writeTemplateState = (next) => {
        try {
          if (typeof window !== 'undefined') window.localStorage?.setItem(TEMPLATE_KEY, JSON.stringify(next))
        } catch {}
      }
      const defaultTone = () => {
        const parsed = parseToneJson(PERSONA_WHALE_JSON)
        return parsed.ok ? cloneTone(parsed.doc) : emptyTone()
      }
      const DEFAULT_TEMPLATE = { id: 'whale', builtin: true, label: '蓝色大肥鱼', name: DEFAULT_PROFILE_NAME, signature: DEFAULT_PROFILE_SIGNATURE, desc: '默认预设' }
      const templateList = (templateState) => [DEFAULT_TEMPLATE, ...(templateState.customs ?? [])].filter((item) => !(templateState.deletedIds ?? []).includes(item.id))
      const templateDoc = (item) => {
        if (item.builtin) return defaultTone()
        return { ...emptyTone(), ...(item.doc ?? {}), schema: TONE_SCHEMA, skipIn: [...TONE_SKIP_DEFAULT] }
      }
      const PREVIEW_CODE = [
        "const KEY = 'dsh-structured.tone'",
        'export function loadTone() {',
        '  try {',
        '    const raw = localStorage.getItem(KEY)',
        '    if (!raw) return DEFAULT_TONE',
        '    const doc = JSON.parse(raw)',
        '    return parseTone(doc) ?? DEFAULT_TONE',
        '  } catch {',
        '    return DEFAULT_TONE // fail-open：读失败不阻断会话',
        '  }',
        '}',
      ]
      const previewVariant = (styleText) => {
        const samples = previewCopy().samples
        if (/直接|direct/i.test(styleText)) return samples.direct
        if (/温和|gentle/i.test(styleText)) return samples.soft
        return samples.playful
      }
      const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
      const previewContent = (sample, styleText) => {
        const variant = previewVariant(String(styleText ?? ''))
        const copy = previewCopy()
        if (sample === 'short') {
          return { version: 1, kind: 'short', text: copy.short }
        }
        if (sample === 'table') {
          return {
            version: 1,
            kind: 'table',
            conclusion: { lead: variant.tableLead, body: '' },
            suggestions: variant.normal.steps.slice(0, 2),
            risk: variant.normal.risk,
            table: { head: [...copy.table.head], rows: copy.table.rows.map(([module, state, note]) => [module, copy.statusText[state], note]) },
          }
        }
        return {
          version: 1,
          kind: 'normal',
          conclusion: { lead: variant.normal.lead, points: [...variant.normal.points] },
          suggestions: [...variant.normal.steps],
          risk: variant.normal.risk,
        }
      }

      // Preview and real replies both receive a typed content object and run the
      // same plugin renderer; no model-authored Markdown cards are involved.
      const previewHtml = (sample, styleText, docOverride, personaOverride = {}) => {
        const doc = docOverride ?? (typeof document !== 'undefined' ? document : null)
        if (!doc || typeof doc.createElement !== 'function') return ''
        const persona = {
          enabled: true,
          name: DEFAULT_PROFILE_NAME,
          signature: DEFAULT_PROFILE_SIGNATURE,
          avatar: '',
          prefix: '',
          suffix: '',
          ...personaOverride,
        }
        const host = doc.createElement('div')
        host.className = 'dss-scope dss-persona-preview'
        host.setAttribute('data-chat-flow-kind', 'assistant-step')
        host.setAttribute('data-chat-node-key', 'preview')
        host.setAttribute('data-chat-turn', '0')
        mountPersonaHead(host, persona)
        const body = doc.createElement('div')
        body.className = 'dss-chat-body'
        body.setAttribute('data-slot', 'conversation.chat.node')
        const markdown = doc.createElement('div')
        markdown.className = '_markdown_preview'
        body.appendChild(markdown)
        host.appendChild(body)
        if (sample === 'code') {
          markdown.innerHTML = `<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_preview">tone-loader.js</span><div class="_actions_preview"></div></div></div><div data-code-block-content><pre>${escapeHtml(PREVIEW_CODE.join(String.fromCharCode(10)))}</pre></div></div>`
          // 代码预览走与真实 code 回复相同的例外通道（renderPersonaMarkdown → decorateStructured）。
          renderPersonaMarkdown(markdown, persona, host)
        } else {
          renderPersonaContent(markdown, previewContent(sample, styleText), persona)
        }
        return host.innerHTML
      }

      /** 预览区六张卡：全部走真实渲染管线（内容对象 → renderPersonaContent），不手写卡片。 */
      const PREVIEW_CARD_SPECS = [
        { id: 'conclusion', title: '结论' },
        { id: 'explain', title: '讲解' },
        { id: 'suggestion', title: '建议' },
        { id: 'risk', title: '风险' },
        { id: 'short', title: '短答' },
        { id: 'table', title: '表格', wide: true },
        { id: 'code', title: '代码', wide: true },
      ]
      const PREVIEW_CARD_SELECTOR = {
        conclusion: '.dss-card-conclusion',
        explain: '.dss-card-explain',
        suggestion: '.dss-card-next',
        risk: '.dss-card-risk',
        short: '.dss-card-short',
        table: '.dss-table-wrap',
        code: '.dss-code',
      }
      const previewCardContent = (id, depth = 'general', styleSample = '') => {
        const copy = previewCopy().cards
        if (id === 'conclusion') return { version: 1, kind: 'normal', conclusion: { lead: styleSample || copy.lead, body: copy.body }, suggestions: [], risk: '' }
        if (id === 'explain') {
          const explanation = depth === 'beginner'
            ? { analogy: copy.beginnerAnalogy, example: copy.beginnerExample }
            : depth === 'expert'
              ? { example: copy.expertExample }
              : { analogy: copy.generalAnalogy }
          return { version: 1, kind: 'normal', conclusion: { lead: copy.lead }, explanation, suggestions: [], risk: '' }
        }
        if (id === 'suggestion') return { version: 1, kind: 'normal', conclusion: { lead: copy.lead }, suggestions: [...copy.steps], risk: '' }
        if (id === 'risk') return { version: 1, kind: 'normal', conclusion: { lead: copy.lead }, suggestions: [], risk: copy.risk }
        if (id === 'short') return { version: 1, kind: 'short', text: copy.short }
        if (id === 'table') return { version: 1, kind: 'table', conclusion: { lead: copy.tableLead }, suggestions: [], risk: '', table: { head: [...copy.tableHead], rows: copy.tableRows.map((row) => [...row]) } }
        return null
      }

      const previewCardCache = new Map()
      const previewCardMarkup = (id, depth = 'general', styleSample = '') => {
        const cacheKey = id + '|' + depth + '|' + styleSample + '|' + detectLocale()
        const cached = previewCardCache.get(cacheKey)
        if (cached !== undefined) return cached
        const doc = typeof document !== 'undefined' ? document : null
        if (!doc || typeof doc.createElement !== 'function') return ''
        try {
          const host = doc.createElement('div')
          host.setAttribute('data-chat-flow-kind', 'assistant-step')
          host.setAttribute('data-chat-node-key', 'preview-' + id)
          host.setAttribute('data-chat-turn', '0')
          const markdown = doc.createElement('div')
          markdown.className = '_markdown_preview'
          host.appendChild(markdown)
          const cardConfig = { enabled: true, headEnabled: false, name: '', signature: '', avatar: '', prefix: '', suffix: '' }
          if (id === 'code') {
            markdown.innerHTML = '<div class="md-code-block"><div class="bannerWrap"><div data-code-block-banner><span class="_heading_preview">tone-loader.js</span><div class="_actions_preview"></div></div></div><div data-code-block-content><pre>' + escapeHtml(PREVIEW_CODE.join(String.fromCharCode(10))) + '</pre></div></div>'
            renderPersonaMarkdown(markdown, cardConfig, host)
            decorateStructured(markdown)
          } else {
            const content = previewCardContent(id, depth, styleSample)
            if (!content) return ''
            renderPersonaContent(markdown, content, cardConfig)
          }
          for (const node of [...(markdown.querySelectorAll?.('.dss-reply-copy, .dss-card-copy, .dss-table-copy') ?? [])]) node.remove()
          const target = markdown.querySelector?.(PREVIEW_CARD_SELECTOR[id] ?? '')
          const html = target ? String(target.outerHTML ?? target.innerHTML ?? '') : String(markdown.innerHTML ?? '')
          previewCardCache.set(cacheKey, html)
          return html
        } catch {
          return ''
        }
      }

      const useEffect = typeof react.useEffect === 'function' ? react.useEffect : () => {}

      const PersonaEditor = ({ state, setField, mutateFields, readFields, tabGuard, onPresetChange }) => {
        const initialRaw = String(fieldValue(state.value, { field: 'persona', fallback: PERSONA_WHALE_JSON }) ?? '')
        const initialParsed = parseToneJson(initialRaw)
        const [doc, setDoc] = react.useState(initialParsed.ok ? initialParsed.doc : defaultTone())
        const [enabled, setEnabled] = react.useState(fieldValue(state.value, { field: 'personaEnabled', fallback: true }) === true)
        const [name, setName] = react.useState(String(fieldValue(state.value, { field: 'personaName', fallback: DEFAULT_PROFILE_NAME }) ?? DEFAULT_PROFILE_NAME))
        const [signature, setSignature] = react.useState(String(fieldValue(state.value, { field: 'personaSignature', fallback: DEFAULT_PROFILE_SIGNATURE }) ?? DEFAULT_PROFILE_SIGNATURE))
        const [avatar, setAvatar] = react.useState(String(fieldValue(state.value, { field: 'personaAvatar', fallback: '' }) ?? ''))
        const [templateId, setTemplateId] = react.useState('whale')
        const [templates, setTemplates] = react.useState(readTemplateState)
        const [status, setStatus] = react.useState(initialParsed.ok ? (enabled ? 'saved' : 'off') : 'dirty')
        const [error, setError] = react.useState(initialParsed.ok ? '' : t('persona.invalidConfig'))
        const [notice, setNotice] = react.useState('')
        const [open, setOpen] = react.useState(false)
        const [emojiFor, setEmojiFor] = react.useState(null)
        // 身份头是独立子开关；旧 profile 没有该字段时按开启处理。
        const [headEnabled, setHeadEnabled] = react.useState(fieldValue(state.value, { field: HEAD_FIELD, fallback: true }) !== false)
        const [innerOs, setInnerOs] = react.useState(fieldValue(state.value, { field: INNER_OS_FIELD, fallback: true }) === true)
        const headFieldSupported = hasConfigField(state.value, HEAD_FIELD)
        const innerOsSupported = hasConfigField(state.value, INNER_OS_FIELD)
        const readonly = state.writable === false
        const busy = status === 'saving'
        const formLocked = readonly || busy
        // 身份头关闭 / 人格关闭时，头像名字签名一起锁住（仍保留在页面上，可重新打开）。
        const headLocked = formLocked || !enabled || !headEnabled
        const dirty = ['dirty', 'draftOff', 'failed'].includes(status)
        const canSave = !readonly && !busy && dirty
        const confirmDirty = () => !dirty || typeof window === 'undefined' || typeof window.confirm !== 'function' || window.confirm(t('persona.discardConfirm'))
        if (tabGuard) tabGuard.confirm = confirmDirty
        const markDirty = () => {
          setStatus('dirty')
          setError('')
          setNotice('')
        }
        const updateTone = (key, value) => {
          if (formLocked) return
          setDoc((current) => ({ ...current, [key]: value }))
          markDirty()
        }
        const updateProfile = (key, value) => {
          if (formLocked) return
          if (key === 'name') setName(value)
          else if (key === 'signature') setSignature(value)
          markDirty()
        }
        const selectTemplate = (id) => {
          if (formLocked) return
          const item = templateList(templates).find((entry) => entry.id === id)
          if (!item) return
          setDoc(templateDoc(item))
          setName(item.name ?? DEFAULT_PROFILE_NAME)
          setSignature(item.signature ?? DEFAULT_PROFILE_SIGNATURE)
          setTemplateId(item.id)
          setOpen(false)
          markDirty()
        }
        const deleteTemplate = (id) => {
          if (formLocked) return
          const next = id === 'whale'
            ? { ...templates, deletedIds: [...new Set([...(templates.deletedIds ?? []), 'whale'])] }
            : { ...templates, customs: (templates.customs ?? []).filter((item) => item.id !== id) }
          setTemplates(next)
          writeTemplateState(next)
          if (templateId === id) setTemplateId(null)
        }
        const saveAsTemplate = () => {
          if (formLocked) return
          const label = name.trim() || t('persona.templateFallbackName')
          const item = {
            id: 'cus-' + Date.now(),
            builtin: false,
            label,
            name,
            signature,
            desc: t('persona.customTemplateDesc', { date: new Date().toLocaleDateString() }),
            doc: { ...doc },
          }
          const next = { ...templates, customs: [...(templates.customs ?? []), item] }
          setTemplates(next)
          writeTemplateState(next)
          setNotice(t('persona.savedTemplate', { label }))
        }
        const resetDefault = () => {
          if (formLocked) return
          if (!confirmDirty()) return
          setDoc(defaultTone())
          setName(DEFAULT_PROFILE_NAME)
          setSignature(DEFAULT_PROFILE_SIGNATURE)
          setAvatar('')
          setEnabled(false)
          setHeadEnabled(false)
          setInnerOs(true)
          setStatus('draftOff')
          setError('')
          setNotice(t('persona.resetNotice'))
          setTemplateId('whale')
          setTemplates({ deletedIds: [], customs: [] })
          writeTemplateState({ deletedIds: [], customs: [] })
        }
        const handleAvatar = (event) => {
          const file = event.target?.files?.[0]
          if (event.target) event.target.value = ''
          if (!file || formLocked) return
          if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
            setError(t('persona.avatarType'))
            setStatus('failed')
            return
          }
          if (typeof FileReader === 'undefined' || typeof Image === 'undefined' || typeof document === 'undefined') return
          const reader = new FileReader()
          reader.onload = () => {
            const image = new Image()
            image.onload = () => {
              try {
                const canvas = document.createElement('canvas')
                canvas.width = 128
                canvas.height = 128
                const context = canvas.getContext('2d')
                const side = Math.min(image.naturalWidth, image.naturalHeight)
                context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 128, 128)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                if (dataUrl.length > 64 * 1024) {
                  setError(t('persona.avatarTooLarge'))
                  setStatus('failed')
                  return
                }
                setAvatar(dataUrl)
                markDirty()
                setNotice(t('persona.avatarUpdated'))
              } catch (avatarError) {
                setError(t('persona.avatarFailed', { message: String(avatarError.message ?? avatarError) }))
                setStatus('failed')
              }
            }
            image.onerror = () => { setError(t('persona.avatarUnreadable')); setStatus('failed') }
            image.src = String(reader.result)
          }
          reader.onerror = () => { setError(t('persona.avatarReadFailed')); setStatus('failed') }
          reader.readAsDataURL(file)
        }
        const insertEmoji = (field, emoji) => {
          if (formLocked) return
          const current = String(doc[field] ?? '')
          const input = typeof document !== 'undefined' ? document.getElementById('dss-' + field) : null
          const start = input && Number.isInteger(input.selectionStart) ? input.selectionStart : current.length
          const end = input && Number.isInteger(input.selectionEnd) ? input.selectionEnd : start
          updateTone(field, current.slice(0, start) + emoji + current.slice(end))
          setEmojiFor(null)
          try {
            requestAnimationFrame(() => {
              input?.focus?.()
              input?.setSelectionRange?.(start + emoji.length, start + emoji.length)
            })
          } catch {}
        }
        useEffect(() => {
          if (typeof document === 'undefined' || (!open && emojiFor === null)) return
          const onDocumentClick = (event) => {
            const target = event.target
            if (open && !target?.closest?.('.dss-source')) setOpen(false)
            if (emojiFor !== null && !target?.closest?.('.dss-control')) setEmojiFor(null)
          }
          const onDocumentKey = (event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              setEmojiFor(null)
            }
          }
          document.addEventListener('click', onDocumentClick)
          document.addEventListener('keydown', onDocumentKey)
          return () => {
            document.removeEventListener('click', onDocumentClick)
            document.removeEventListener('keydown', onDocumentKey)
          }
        }, [open, emojiFor])
        const save = async () => {
          if (!canSave) return
          const parsed = parseToneJson(JSON.stringify(doc))
          if (!parsed.ok) {
            setStatus('failed')
            setError(describeInvalidTone(JSON.stringify(doc), parsed))
            return
          }
          const nextRaw = JSON.stringify(parsed.doc, null, 2)
          const nextRevision = (Number(fieldValue(state.value, { field: 'personaRevision', fallback: 0 })) || 0) + 1
          const previous = {
            persona: String(fieldValue(state.value, { field: 'persona', fallback: PERSONA_WHALE_JSON }) ?? ''),
            personaEnabled: fieldValue(state.value, { field: 'personaEnabled', fallback: true }) === true,
            personaRevision: Number(fieldValue(state.value, { field: 'personaRevision', fallback: 0 })) || 0,
            personaName: String(fieldValue(state.value, { field: 'personaName', fallback: DEFAULT_PROFILE_NAME }) ?? DEFAULT_PROFILE_NAME),
            personaSignature: String(fieldValue(state.value, { field: 'personaSignature', fallback: DEFAULT_PROFILE_SIGNATURE }) ?? DEFAULT_PROFILE_SIGNATURE),
            personaAvatar: String(fieldValue(state.value, { field: 'personaAvatar', fallback: '' }) ?? ''),
          }
          const writes = [
            ['persona', nextRaw],
            ['personaEnabled', enabled],
            ...(headFieldSupported ? [['personaHeadEnabled', enabled && headEnabled]] : []),
            ['personaRevision', nextRevision],
            ['personaName', name],
            ['personaSignature', signature],
            ['personaAvatar', avatar],
            ...(innerOsSupported ? [['personaInnerOsEnabled', innerOs]] : []),
          ]
          const finishSaved = () => {
            setDoc(parsed.doc)
            setStatus(enabled ? 'saved' : 'savedOff')
            setError('')
            setNotice('')
          }
          setStatus('saving')
          if (typeof mutateFields === 'function') {
            try {
              const accepted = await mutateFields(writes.map(([field, value]) => ({ op: 'set', path: [field], value })), state.revision)
              if (accepted === false) throw new Error(t('persona.writeRejected'))
              finishSaved()
            } catch (saveError) {
              setStatus('failed')
              setError(t('persona.writeFailed', { message: String(saveError.message ?? saveError) }))
            }
            return
          }
          const written = []
          try {
            for (const [field, value] of writes) {
              const result = await setField(field, value)
              if (result === false) throw new Error(field + ' write rejected')
              written.push([field, previous[field]])
            }
            if (typeof readFields !== 'function') throw new Error(t('persona.missingReadApi'))
            const snapshot = await readFields()
            const current = snapshot && typeof snapshot === 'object' ? snapshot.value : undefined
            const mismatched = []
            if (!current || current.persona !== nextRaw) mismatched.push('persona')
            if (!current || current.personaEnabled !== enabled) mismatched.push('personaEnabled')
            if (headFieldSupported && (!current || current.personaHeadEnabled !== (enabled && headEnabled))) mismatched.push('personaHeadEnabled')
            if (innerOsSupported && (!current || current.personaInnerOsEnabled !== innerOs)) mismatched.push('personaInnerOsEnabled')
            if (!current || current.personaRevision !== nextRevision) mismatched.push('personaRevision')
            if (!current || current.personaName !== name) mismatched.push('personaName')
            if (!current || current.personaSignature !== signature) mismatched.push('personaSignature')
            if (!current || current.personaAvatar !== avatar) mismatched.push('personaAvatar')
            if (mismatched.length) throw new Error(t('persona.readbackMismatch', { fields: mismatched.join(', ') }))
            finishSaved()
          } catch (saveError) {
            const rollbackErrors = []
            const rollback = async (field, value) => {
              const result = await setField(field, value)
              if (result === false) throw new Error('rejected')
            }
            for (const [field, value] of written.reverse()) {
              try { await rollback(field, value) } catch (rollbackError) { rollbackErrors.push(field + ': ' + String(rollbackError.message ?? rollbackError)) }
            }
            const base = String(saveError.message ?? saveError)
            setStatus('failed')
            setError(rollbackErrors.length ? t('persona.rollbackFailed', { message: base, errors: rollbackErrors.join('；') }) : base)
          }
        }
        const statusText = error || notice || statusTextFor(status)
        const profileAvatar = avatar || DEFAULT_AVATAR
        const activePreset = findStylePreset(String(doc.style ?? ''))?.id ?? null
        const activePresetEntry = activePreset ? STYLE_PRESETS.find((preset) => preset.id === activePreset) : null
        const activePresetLabel = activePresetEntry ? stylePresetLabel(activePresetEntry) : t('persona.customPreset')
        const activePresetOs = stylePresetOs(activePresetEntry || STYLE_PRESETS[0])
        const activePresetSample = activePresetEntry ? stylePresetSample(activePresetEntry) : t('persona.customStyle')
        const profileRows = () => {
          const list = templateList(templates)
          if (list.length === 0) return jsx('div', { className: 'dss-template-empty', children: t('persona.templateEmpty') })
          return jsx('div', {
            className: 'dss-template-list',
            children: list.map((item) => jsxs('div', {
              className: 'dss-template-row',
              children: [
                jsxs('button', {
                  type: 'button',
                  role: 'radio',
                  className: 'dss-template-option',
                  'aria-checked': String(templateId === item.id),
                  onClick: () => selectTemplate(item.id),
                  children: [
                    jsx('span', { className: 'mark', children: String(item.name || '?').charAt(0) }),
                    jsxs('span', { children: [jsx('strong', { children: item.label }), jsx('em', { children: item.builtin ? t('persona.defaultTemplateDesc') : item.desc })] }),
                  ],
                }),
                jsx('button', {
                  type: 'button',
                  className: 'dss-template-del',
                  title: t('persona.deleteTemplate'),
                  'aria-label': t('persona.deleteTemplate'),
                  onClick: (event) => { event.stopPropagation(); deleteTemplate(item.id) },
                  children: '×',
                }),
              ],
            })),
          })
        }
        return jsxs('div', {
          className: 'dss-config dss-scope',
          'data-dsh-persona': '1',
          children: [
            jsxs('div', {
              className: 'dss-section-head',
              children: [
                jsx('h2', { className: 'dss-section-title', children: t('persona.title') }),
                jsx(ui.Switch, {
                  checked: enabled,
                  disabled: formLocked,
                  label: t('persona.masterSwitch'),
                  onChange: (next) => {
                    if (formLocked) return
                    setEnabled(next)
                    // 人格关闭 → 身份头自动关闭（设计稿：身份头不可脱离人格单独开）。
                    if (!next) setHeadEnabled(false)
                    setStatus(next ? 'dirty' : 'draftOff')
                    setError('')
                    setNotice('')
                  },
                }),
              ],
            }),
            jsx('p', { className: 'dss-note', children: t('persona.note') }),
            jsxs('div', {
              className: 'dss-identity',
              'data-dsh-persona-block': 'head',
              children: [
                jsxs('div', {
                  className: 'dss-identity-row',
                  children: [
                    jsx('span', { className: 'dss-inline-hint', children: t('persona.headHint') }),
                    jsx(ui.Switch, {
                      checked: enabled && headEnabled,
                      disabled: formLocked || !enabled || !headFieldSupported,
                      label: t('persona.headSwitch'),
                      onChange: (next) => {
                        if (formLocked || !enabled) return
                        setHeadEnabled(next)
                        markDirty()
                      },
                    }),
                  ],
                }),
            jsxs('section', {
              className: 'dss-profile',
              children: [
                jsxs('label', {
                  className: 'dss-profile-avatar',
                  title: t('persona.avatarTitle'),
                  children: [
                    jsx('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', className: 'dss-hidden', disabled: headLocked, onChange: handleAvatar }),
                    jsx('img', { src: profileAvatar, alt: t('persona.avatarAlt') }),
                  ],
                }),
                jsxs('div', {
                  className: 'dss-profile-info',
                  children: [
                    jsx('input', { className: 'dss-profile-name', value: name, maxLength: 40, disabled: headLocked, 'aria-label': t('persona.displayName'), placeholder: t('persona.displayName'), onChange: (event) => updateProfile('name', event.target.value) }),
                    jsx('input', { className: 'dss-profile-sig', value: signature, maxLength: 60, disabled: headLocked, 'aria-label': t('persona.signature'), placeholder: t('persona.signature'), onChange: (event) => updateProfile('signature', event.target.value) }),
                  ],
                }),
                jsxs('div', {
                  className: 'dss-source',
                  children: [
                    jsxs('button', {
                      type: 'button',
                      className: 'dss-source-btn',
                      'aria-haspopup': 'true',
                      'aria-expanded': String(open),
                      disabled: formLocked,
                      onClick: (event) => { event.stopPropagation(); setOpen(!open) },
                      children: [jsx('span', { children: t('persona.switch') }), jsx('span', { className: 'dss-caret', 'aria-hidden': 'true' })],
                    }),
                    open ? jsxs('div', {
                      className: 'dss-popover',
                      role: 'radiogroup',
                      'aria-label': t('persona.templateGroupAria'),
                      children: [
                        profileRows(),
                        jsx('div', { className: 'dss-template-foot', children: jsx('button', { type: 'button', className: 'dss-template-save', onClick: saveAsTemplate, children: t('persona.saveTemplate') }) }),
                      ],
                    }) : null,
                  ],
                }),
              ],
            }),
              ],
            }),
            jsxs('div', {
              className: 'dss-field-row',
              children: [
                jsxs('div', {
                  className: 'dss-field',
                  children: [
                    jsxs('div', { className: 'dss-field-label', children: [jsx('label', { htmlFor: 'dss-username', children: t('persona.nickname') }), jsx('span', { className: 'dss-hint', children: t('persona.nicknameHint') })] }),
                    jsx('input', { id: 'dss-username', className: 'dss-input', value: doc.userName ?? '', maxLength: 20, disabled: formLocked, onChange: (event) => updateTone('userName', event.target.value) }),
                  ],
                }),
                jsxs('div', {
                  className: 'dss-field',
                  children: [
                    jsxs('div', { className: 'dss-field-label', children: [jsx('label', { htmlFor: 'dss-selfname', children: t('persona.selfName') }), jsx('span', { className: 'dss-hint', children: t('persona.selfNameHint') })] }),
                    jsx('input', { id: 'dss-selfname', className: 'dss-input', value: doc.selfName ?? '', maxLength: 20, disabled: formLocked, onChange: (event) => updateTone('selfName', event.target.value) }),
                  ],
                }),
              ],
            }),
            jsxs('div', {
              className: 'dss-group',
              'data-dsh-persona-block': 'style',
              children: [
                jsx('div', { className: 'dss-group-title', children: t('persona.styleGroup') }),
                jsx('div', {
                  className: 'dss-chips',
                  children: [
                    jsx('span', { className: 'dss-hint', children: t('persona.styleHint') }),
                    ...STYLE_PRESETS.map((preset) => jsx('button', {
                      type: 'button',
                      className: 'dss-chip-btn' + (activePreset === preset.id ? ' is-selected' : ''),
                      'aria-pressed': String(activePreset === preset.id),
                      disabled: formLocked,
                      onClick: () => {
                        if (formLocked) return
                        updateTone('style', stylePresetPrompt(preset))
                        onPresetChange?.(preset)
                      },
                      children: stylePresetLabel(preset),
                    })),
                  ],
                }),
                jsx('div', { className: 'dss-hint', children: t('persona.presetHint1') }),
                jsx('div', { className: 'dss-hint', children: t('persona.presetHint2') }),
                jsxs('div', {
                  className: 'dss-field',
                  children: [
                    jsxs('div', { className: 'dss-field-label', children: [jsx('label', { htmlFor: 'dss-style', children: t('persona.speakingStyle') }), jsx('span', { className: 'dss-hint', children: t('persona.speakingStyleHint') })] }),
                jsxs('div', {
                  className: 'dss-control',
                  children: [
                    jsx('textarea', { id: 'dss-style', className: 'dss-textarea', value: doc.style ?? '', maxLength: 1200, rows: 1, disabled: formLocked, onChange: (event) => { updateTone('style', event.target.value); onPresetChange?.(null) } }),
                    jsx('button', { type: 'button', className: 'dss-icon-btn', style: { top: 6, transform: 'none' }, title: t('persona.insertEmoji'), 'aria-label': t('persona.insertEmoji'), onClick: (event) => { event.stopPropagation(); setEmojiFor(emojiFor === 'style' ? null : 'style') }, children: '☺' }),
                    emojiFor === 'style' ? jsx('div', {
                      className: 'dss-emoji-panel is-open',
                      'aria-label': t('persona.chooseEmoji'),
                      children: EMOJIS.map((emoji) => jsx('button', { type: 'button', onClick: (event) => { event.stopPropagation(); insertEmoji('style', emoji) }, children: emoji })),
                    }) : null,
                  ],
                }),
                jsx('div', { className: 'dss-field-meta', children: jsx('span', { className: 'dss-counter', children: String(doc.style ?? '').length + ' / 1200' }) }),
              ],
            }),
                jsxs('div', {
                  className: 'dss-field',
                  children: [
                    jsxs('div', {
                      className: 'dss-os-row',
                      children: [
                        jsxs('div', {
                          className: 'dss-field-label',
                          style: { marginBottom: 0 },
                          children: [
                            jsx('label', { children: t('persona.innerOs') }),
                            jsx('span', { className: 'dss-hint', children: t('persona.innerOsHint', { preset: activePresetLabel }) }),
                          ],
                        }),
                        innerOsSupported
                          ? jsx(ui.Switch, { checked: innerOs, disabled: formLocked, label: t('persona.innerOs'), onChange: (next) => { if (formLocked) return; setInnerOs(next); markDirty() } })
                          : jsx('span', { className: 'dss-hint', children: t('persona.innerOsUnsupported') }),
                      ],
                    }),
                    jsx('div', { className: 'dss-os-preview', children: '💭 ' + activePresetOs }),
                  ],
                }),
              ],
            }),
            jsx('p', { className: 'dss-rules', children: t('persona.rules') }),
            jsxs('div', {
              className: 'dss-save',
              children: [
                jsx('span', { className: 'dss-save-state' + (error ? ' is-error' : ''), children: statusText }),
                jsxs('div', {
                  className: 'dss-save-actions',
                  children: [
                    jsx('button', { type: 'button', className: 'dss-btn', disabled: formLocked, onClick: resetDefault, children: t('persona.reset') }),
                    jsx('button', { type: 'button', className: 'dss-btn dss-btn-primary', disabled: !canSave, onClick: save, children: t('persona.save') }),
                  ],
                }),
              ],
            }),
          ],
        })
      }

      const SidebarPanelIcon = (iconProps) => jsx('svg', {
        width: iconProps?.size ?? 16,
        height: iconProps?.size ?? 16,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        'aria-hidden': 'true',
        children: [
          jsx('rect', { x: 2.5, y: 2.5, width: 11, height: 11, rx: 2.5 }),
          jsx('path', { d: 'M5 6h6M5 9h6M5 12h3' }),
        ],
      })
      const configFace = () => ({
        hooks: { structuredConfig: form },
        setField: (field, value) => {
          try {
            return form.set(field, value)
          } catch (error) {
            return Promise.reject(error)
          }
        },
        mutateFields: typeof form.mutate === 'function'
          ? (ops, revision) => form.mutate(ops, revision)
          : undefined,
        readFields: typeof form.getSnapshot === 'function'
          ? () => form.getSnapshot()
          : undefined,
      })
      /** 侧边栏双入口的注册结果：宿主不声明 slot 时记录失败，退化到「只留详情页 / 只留入口」。 */
      const sidebarRegistration = { entry: null, panel: null, failed: [] }
      const registerSlot = (name, options, component) => {
        if (typeof child?.slots?.inject !== 'function' || typeof child?.slots?.register !== 'function') {
          sidebarRegistration.failed.push(name)
          return null
        }
        try {
          return child.slots.inject(name, () => child.slots.register(options, component))
        } catch (error) {
          sidebarRegistration.failed.push(name)
          try { console.info('[dsh-structured] slot unavailable: ' + name + ' · ' + String(error?.message ?? error)) } catch {}
          return null
        }
      }
      let svDragHue = null
      const StructuredConfigCard = (props) => {
        if (props.view !== undefined && props.view !== 'page' && props.view !== 'panel') return null
        const personaGuard = {}
        const read = props.useStructuredConfig ?? props.structuredConfig
        const state = typeof read === 'function' ? read((snapshot) => snapshot) : null
        if (!state || state.status !== 'ready' || typeof state.value !== 'object' || state.value === null) {
          return jsx('p', { style: noteStyle, children: t('meta.unavailable') })
        }
        const value = state.value
        const writable = state.writable !== false
        const setField = typeof props.setField === 'function' ? props.setField : () => {}
        const mutateFields = typeof props.mutateFields === 'function' ? props.mutateFields : null
        const readFields = typeof props.readFields === 'function' ? props.readFields : null
        const masterField = hasConfigField(value, MASTER_FIELD) ? MASTER_FIELD : MASTER_FALLBACK_FIELD
        const masterOn = fieldValue(value, { field: masterField, fallback: true }) !== false
        const theme = String(fieldValue(value, { field: 'theme', fallback: 'deepseek' }))
        const depth = String(fieldValue(value, { field: 'contentDepth', fallback: 'general' }))
        const personaOn = fieldValue(value, { field: 'personaEnabled', fallback: true }) === true
        const headOn = fieldValue(value, { field: HEAD_FIELD, fallback: true }) !== false
        const [previewPreset, setPreviewPreset] = react.useState(null)
        const [palette, setPaletteState] = react.useState(() => paletteFromRaw(fieldValue(value, { field: 'themeCustom', fallback: '' })).palette)
        const [picker, setPicker] = react.useState(null)
        const [hexDraft, setHexDraft] = react.useState('')
        // 宿主语言运行时切换：订阅 locale 快照修订，强制重渲染（t 在渲染时读取）。
        const [, setLocaleRevision] = react.useState(0)
        useEffect(() => subscribeLocale(() => setLocaleRevision((value) => value + 1)), [])
        const write = (field, next) => {
          if (!writable) return
          try { setField(field, next) } catch { /* 宿主拒绝时保留界面状态 */ }
        }
        const syncPalette = (next) => {
          setPaletteState(next)
          previewCustomTheme(next)
        }
        const commitPalette = (nextPalette) => {
          if (!writable) return
          const fixed = autoFixPalette(nextPalette)
          syncPalette(fixed)
          write('themeCustom', paletteJson(fixed))
          if (theme !== CUSTOM_THEME) write('theme', CUSTOM_THEME)
        }
        const selectTheme = (id) => {
          if (!writable) return
          write('theme', id)
          if (id !== CUSTOM_THEME) setPicker(null)
          if (id === CUSTOM_THEME) {
            const fixed = autoFixPalette(palette)
            syncPalette(fixed)
            write('themeCustom', paletteJson(fixed))
          }
        }
        const openPicker = (key) => {
          if (!writable) return
          setPicker(picker === key ? null : key)
          setHexDraft(normalizeHex(palette[key], DEFAULT_PALETTE[key]))
        }
        const updateColor = (key, hex) => {
          if (!writable) return
          const next = { ...palette, [key]: normalizeHex(hex, palette[key]) }
          syncPalette(next)
          setHexDraft(next[key])
        }
        const commitColor = (key, hex) => {
          if (!writable) return
          const fixed = autoFixPalette({ ...palette, [key]: normalizeHex(hex, palette[key]) })
          syncPalette(fixed)
          setHexDraft(fixed[key])
          write('themeCustom', paletteJson(fixed))
          if (theme !== CUSTOM_THEME) write('theme', CUSTOM_THEME)
        }
        /** 确认：提交当前草稿颜色并关闭浮层；HEX 非法时提交调色板里已有的值。 */
        const confirmPicker = () => {
          if (!picker) return
          const next = parseHexColor(hexDraft) ? hexDraft : palette[picker]
          commitColor(picker, next)
          setPicker(null)
        }
        /** 取消：回到已保存的三色（丢弃未提交的实时预览）并关闭。 */
        const cancelPicker = () => {
          const saved = paletteFromRaw(fieldValue(value, { field: 'themeCustom', fallback: '' })).palette
          setPaletteState(saved)
          previewCustomTheme(saved)
          setHexDraft('')
          setPicker(null)
        }
        const pointerRect = (event) => {
          const target = event?.currentTarget
          const rect = typeof target?.getBoundingClientRect === 'function' ? target.getBoundingClientRect() : null
          return rect && Number(rect.width) > 0 ? rect : { left: 0, top: 0, width: 240, height: 150 }
        }
        const pickSv = (event, options = {}) => {
          if (!picker || !writable) return
          const rect = pointerRect(event)
          const x = Math.max(0, Math.min(rect.width, (Number(event?.clientX) || 0) - rect.left))
          const y = Math.max(0, Math.min(rect.height, (Number(event?.clientY) || 0) - rect.top))
          const hsv = rgbToHsv(parseHexColor(palette[picker]) ?? { r: 0, g: 0, b: 0 })
          const hue = Number.isFinite(svDragHue) ? svDragHue : hsv.h
          const hex = hexFromRgb(hsvToRgb(hue, (x / rect.width) * 100, (1 - y / rect.height) * 100))
          if (options.commit) commitColor(picker, hex)
          else updateColor(picker, hex)
        }
        const pickHue = (event, options = {}) => {
          if (!picker || !writable) return
          const rect = pointerRect(event)
          const x = Math.max(0, Math.min(rect.width, (Number(event?.clientX) || 0) - rect.left))
          const hsv = rgbToHsv(parseHexColor(palette[picker]) ?? { r: 0, g: 0, b: 0 })
          const hex = hexFromRgb(hsvToRgb((x / rect.width) * 360, hsv.s, hsv.v))
          if (options.commit) commitColor(picker, hex)
          else updateColor(picker, hex)
        }
        const useEyedropper = async () => {
          if (!picker || !writable) return
          const EyeDropperCtor = typeof window !== 'undefined' ? window.EyeDropper : undefined
          if (typeof EyeDropperCtor !== 'function') return
          try {
            const result = await new EyeDropperCtor().open()
            commitColor(picker, normalizeHex(result?.sRGBHex ?? palette[picker], palette[picker]))
          } catch {
            // 用户取消 / 宿主拒绝：保持当前颜色。
          }
        }
        const validation = paletteValidation(palette)
        const activeColor = picker ? normalizeHex(palette[picker], DEFAULT_PALETTE[picker]) : ''
        const activeHsv = rgbToHsv(parseHexColor(activeColor) ?? { r: 0, g: 0, b: 0 })
        const statusHead = personaOn && headOn ? t('meta.headOn') : t('meta.headOff')
        const header = jsxs('header', {
          className: 'dss-page-head',
          children: [
            jsxs('div', {
              className: 'dss-page-heading',
              children: [
                jsx('div', { className: 'dss-eyebrow', children: t('meta.eyebrow') }),
                jsx('h1', { className: 'dss-page-title', children: t('meta.title') }),
                jsx('p', { className: 'dss-page-sub', children: t('meta.subtitle') }),
                jsxs('div', {
                  className: 'dss-status-line',
                  'data-dss-status': '1',
                  children: [
                    jsx('span', { className: 'dss-status-dot' + (masterOn ? '' : ' is-off') }),
                    jsx('span', { children: t('meta.statusLine', { master: masterOn ? t('meta.on') : t('meta.off'), persona: personaOn ? t('meta.on') : t('meta.off'), head: statusHead, depth: depthLabel(depth) }) }),
                  ],
                }),
              ],
            }),
            jsx(ui.Switch, {
              checked: masterOn,
              disabled: !writable,
              label: t('meta.masterSwitch'),
              onChange: (next) => write(masterField, next === true),
            }),
          ],
        })
        const popover = picker ? jsxs('div', {
          className: 'dss-color-pop',
          'data-dss-picker': picker,
          children: [
            jsxs('div', {
              className: 'dss-cp-head',
              children: [
                jsx('b', { children: paletteLabel(picker) }),
                jsx('span', { children: t('picker.current', { color: activeColor }) }),
                jsx('button', { type: 'button', className: 'dss-link-btn', disabled: !writable, onClick: () => commitPalette({ ...palette, [picker]: DEFAULT_PALETTE[picker] }), children: t('persona.reset') }),
              ],
            }),
            jsx('div', {
              className: 'dss-sv',
              'data-dss-sv': picker,
              role: 'slider',
              'aria-label': t('picker.svAria', { label: paletteLabel(picker) }),
              style: { background: 'linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(' + Math.round(activeHsv.h) + ' 100% 50%))' },
              onPointerDown: (event) => { svDragHue = activeHsv.h; event.currentTarget.setPointerCapture?.(event.pointerId); pickSv(event) },
              onPointerMove: (event) => { if (event?.buttons) pickSv(event) },
              onPointerUp: (event) => { pickSv(event, { commit: true }); svDragHue = null; event.currentTarget.releasePointerCapture?.(event.pointerId) },
              children: jsx('i', { className: 'dss-sv-dot', style: { left: activeHsv.s + '%', top: (100 - activeHsv.v) + '%' } }),
            }),
            jsx('div', {
              className: 'dss-hue',
              'data-dss-hue': picker,
              role: 'slider',
              'aria-label': t('picker.hueAria'),
              onPointerDown: (event) => { event.currentTarget.setPointerCapture?.(event.pointerId); pickHue(event) },
              onPointerMove: (event) => { if (event?.buttons) pickHue(event) },
              onPointerUp: (event) => { pickHue(event, { commit: true }); svDragHue = null; event.currentTarget.releasePointerCapture?.(event.pointerId) },
              children: jsx('i', { className: 'dss-hue-dot', style: { left: (activeHsv.h / 360) * 100 + '%' } }),
            }),
            jsxs('div', {
              className: 'dss-cp-row',
              children: [
                jsx('input', {
                  id: 'dss-hex-' + picker,
                  value: hexDraft,
                  'aria-label': t('picker.hexAria'),
                  maxLength: 7,
                  disabled: !writable,
                  onChange: (event) => {
                    const next = event.target.value
                    setHexDraft(next)
                    if (parseHexColor(next)) updateColor(picker, next)
                  },
                  onBlur: () => { if (parseHexColor(hexDraft)) commitColor(picker, hexDraft); else setHexDraft(activeColor) },
                  onKeyDown: (event) => { if (event.key === 'Enter' && parseHexColor(hexDraft)) commitColor(picker, hexDraft) },
                }),
                jsx('button', {
                  type: 'button',
                  className: 'dss-eyedropper',
                  disabled: typeof window === 'undefined' || typeof window.EyeDropper !== 'function',
                  title: typeof window !== 'undefined' && typeof window.EyeDropper === 'function' ? t('picker.eyedropperTitle') : t('picker.eyedropperUnsupported'),
                  onClick: useEyedropper,
                  children: t('picker.eyedropper'),
                }),
              ],
            }),
            jsxs('div', {
              className: 'dss-cp-preview',
              children: [
                jsxs('span', { className: 'dss-cp-card', style: { borderLeftColor: palette.primary }, children: [jsx('i', { children: t('preview.card.conclusion') }), jsx('b', { children: t('picker.previewConclusionText') })] }),
                jsxs('span', { className: 'dss-cp-card', style: { borderLeftColor: palette.secondary }, children: [jsx('i', { children: t('preview.card.suggestion') }), jsx('b', { children: t('picker.previewSuggestionText') })] }),
              ],
            }),
            jsxs('div', {
              className: 'dss-cp-foot',
              children: [
                jsx('span', { className: validation.contrast.every((item) => item.ok) ? 'ok' : '', children: t('picker.contrastValue', { ratios: validation.contrast.map((item) => item.ratio.toFixed(1) + ':1').join(' / '), state: validation.contrast.every((item) => item.ok) ? t('picker.contrastPass') : t('picker.contrastAutoFixed') }) }),
                jsx('span', { children: validation.hue.every((item) => item.ok) ? t('picker.hueOk') : t('picker.hueClose') }),
              ],
            }),
            jsxs('div', {
              className: 'dss-cp-actions',
              children: [
                jsx('button', { type: 'button', className: 'dss-btn', onClick: cancelPicker, children: t('picker.cancel') }),
                jsx('button', { type: 'button', className: 'dss-btn dss-btn-primary', onClick: confirmPicker, children: t('picker.confirm') }),
              ],
            }),
          ],
        }) : null
        const appearance = jsxs('section', {
          className: 'dss-page-section',
          'data-dss-section': 'appearance',
          children: [
            jsxs('div', { className: 'dss-section-head', children: [
              jsxs('h2', { className: 'dss-section-title', children: [t('appearance.title'), jsx('span', { className: 'dss-chip is-ok', children: t('meta.live') })] }),
            ] }),
            jsx('p', { className: 'dss-section-desc', children: t('appearance.desc') }),
            jsx('div', {
              className: 'dss-theme-tiles',
              children: THEME_PRESETS.map((preset) => jsxs('button', {
                type: 'button',
                id: 'dss-theme-tile-' + preset.id,
                className: 'dss-theme-tile' + (theme === preset.id ? ' is-selected' : ''),
                'aria-pressed': String(theme === preset.id),
                disabled: !writable,
                onClick: () => selectTheme(preset.id),
                children: [
                  jsx('span', { className: 'dss-theme-mini', style: { borderLeftColor: preset.accent, background: 'linear-gradient(135deg,' + rgbaOf(preset.accent, 0.16) + ', var(--dss-paper) 72%)' } }),
                  jsxs('span', { className: 'dss-theme-name', children: [preset.label, theme === preset.id ? jsx('em', { children: t('meta.current') }) : null] }),
                ],
              })),
            }),
            jsxs('div', {
              className: 'dss-theme-tiles dss-custom-row',
              children: [
                jsxs('button', {
                  type: 'button',
                  id: 'dss-theme-tile-' + CUSTOM_THEME,
                  className: 'dss-theme-tile' + (theme === CUSTOM_THEME ? ' is-selected' : ''),
                  'aria-pressed': String(theme === CUSTOM_THEME),
                  disabled: !writable,
                  onClick: () => selectTheme(CUSTOM_THEME),
                  children: [
                    jsx('span', { className: 'dss-theme-mini', style: { borderLeftColor: palette.primary, background: 'linear-gradient(135deg,' + rgbaOf(palette.primary, 0.18) + ',' + rgbaOf(palette.secondary, 0.1) + ' 55%, var(--dss-paper) 100%)' } }),
                    jsxs('span', { className: 'dss-theme-name', children: [t('appearance.custom'), theme === CUSTOM_THEME ? jsx('em', { children: t('meta.current') }) : null] }),
                  ],
                }),
                jsxs('div', {
                  className: 'dss-colors' + (theme === CUSTOM_THEME ? '' : ' is-disabled'),
                  children: [
                    ...PALETTE_KEYS.map((key) => jsxs('div', {
                      className: 'dss-color-item',
                      children: [
                        jsx('span', { className: 'dss-color-label', children: paletteLabel(key) }),
                        jsx('button', {
                          type: 'button',
                          id: 'dss-color-' + key,
                          className: 'dss-color-swatch',
                          'aria-label': paletteLabel(key) + ' ' + palette[key],
                          style: { background: theme === CUSTOM_THEME ? palette[key] : 'var(--dss-line-strong)' },
                          disabled: !writable || theme !== CUSTOM_THEME,
                          onClick: () => openPicker(key),
                        }),
                      ],
                    })),
                    jsx('button', { type: 'button', className: 'dss-link-btn', disabled: !writable || theme !== CUSTOM_THEME, onClick: () => commitPalette(DEFAULT_PALETTE), children: t('appearance.resetPalette') }),
                    theme === CUSTOM_THEME ? jsx('p', { className: 'dss-hint', style: { flexBasis: '100%', margin: '4px 0 0' }, children: t('appearance.customHint') }) : null,
                  ],
                }),
              ],
            }),
            theme === CUSTOM_THEME ? popover : null,
          ],
        })
        const behaviorRow = (spec, control) => jsxs('div', {
          className: 'dss-behavior-row',
          children: [
            jsxs('div', {
              className: 'dss-behavior-text',
              children: [
                jsx('div', { className: 'dss-behavior-label', children: spec.label }),
                jsx('div', { className: 'dss-hint', children: spec.hint }),
              ],
            }),
            control,
          ],
        })
        const behavior = jsxs('section', {
          className: 'dss-page-section',
          'data-dss-section': 'behavior',
          children: [
            jsxs('div', { className: 'dss-section-head', children: [
              jsxs('h2', { className: 'dss-section-title', children: [t('behavior.title'), jsx('span', { className: 'dss-chip is-ok', children: t('meta.live') })] }),
            ] }),
            jsx('p', { className: 'dss-section-desc', children: t('behavior.desc') }),
            behaviorRow({ label: t('behavior.defaultEnabled'), hint: t('behavior.defaultEnabledHint') }, jsx(ui.Switch, {
              checked: fieldValue(value, { field: 'defaultEnabled', fallback: true }) !== false,
              disabled: !writable,
              label: t('behavior.defaultEnabled'),
              onChange: (next) => write('defaultEnabled', next === true),
            })),
            behaviorRow({ label: t('behavior.subagents'), hint: t('behavior.subagentsHint') }, jsx(ui.Switch, {
              checked: fieldValue(value, { field: 'includeSubagents', fallback: false }) === true,
              disabled: !writable,
              label: t('behavior.subagents'),
              onChange: (next) => write('includeSubagents', next === true),
            })),
            behaviorRow({ label: t('behavior.genui'), hint: t('behavior.genuiHint') }, jsx(ui.SegmentedControl, {
              id: 'dsh-structured-genui',
              value: String(fieldValue(value, { field: 'genui', fallback: 'auto' })),
              options: [['auto', 'auto'], ['on', 'on'], ['off', 'off']].map(([option, label]) => ({ value: option, label })),
              disabled: !writable,
              label: t('behavior.genui'),
              onChange: (next) => write('genui', next),
            })),
            behaviorRow({ label: t('behavior.sidebar'), hint: t('behavior.sidebarHint') }, jsx(ui.Switch, {
              id: 'dsh-structured-sidebar-entry',
              checked: fieldValue(value, { field: 'sidebarEntry', fallback: true }) !== false,
              disabled: !writable,
              label: t('behavior.sidebar'),
              onChange: (next) => write('sidebarEntry', next === true),
            })),
          ],
        })
        const depthSection = jsxs('section', {
          className: 'dss-page-section',
          'data-dss-section': 'depth',
          children: [
            jsxs('div', { className: 'dss-section-head', children: [
              jsxs('h2', { className: 'dss-section-title', children: [t('depth.title'), jsx('span', { className: 'dss-chip is-ok', children: t('meta.live') })] }),
            ] }),
            jsx('p', { className: 'dss-section-desc', children: t('depth.desc') }),
            jsx('div', {
              className: 'dss-depth-tiles',
              children: depthOptionsFor().map((option) => jsxs('button', {
                type: 'button',
                id: 'dss-depth-' + option.value,
                className: 'dss-depth-tile' + (depth === option.value ? ' is-selected' : ''),
                'aria-pressed': String(depth === option.value),
                disabled: !writable,
                onClick: () => write('contentDepth', option.value),
                children: [
                  jsxs('span', { className: 'dss-depth-name', children: [option.label, depth === option.value ? jsx('em', { children: t('meta.current') }) : null] }),
                  jsx('span', { className: 'dss-depth-hint', children: option.hint }),
                ],
              })),
            }),
            jsx('p', { className: 'dss-hint', style: { marginTop: '10px' }, children: t('depth.note') }),
          ],
        })
        const previewToneParsed = parseToneJson(String(fieldValue(value, { field: 'persona', fallback: '' })))
        const previewStyleText = previewToneParsed.ok ? previewToneParsed.doc.style : ''
        const savedPreset = findStylePreset(previewStyleText)
        const effectivePreviewPreset = previewPreset ?? savedPreset
        const previewOsSample = stylePresetOs(effectivePreviewPreset || STYLE_PRESETS[0])
        const previewStyleSample = effectivePreviewPreset ? stylePresetSample(effectivePreviewPreset) : ''
        const previewPersonaOn = fieldValue(value, { field: 'personaEnabled', fallback: true }) === true
        const previewSection = jsxs('section', {
          className: 'dss-page-section',
          'data-dss-section': 'preview',
          children: [
            jsxs('div', { className: 'dss-section-head', children: [
              jsxs('h2', { className: 'dss-section-title', children: [t('preview.title'), jsx('span', { className: 'dss-chip', children: t('preview.allCards') }), jsx('span', { className: 'dss-chip', children: t('preview.depthChip', { depth: depthLabel(depth) }) })] }),
            ] }),
            jsx('p', { className: 'dss-section-desc', children: t('preview.desc') }),
            previewPersonaOn ? jsxs('div', { className: 'dss-preview-persona dss-scope', children: [
              jsx('b', { children: String(fieldValue(value, { field: 'personaName', fallback: '蓝色大肥鱼' })) }),
              jsx('span', { children: String(fieldValue(value, { field: 'personaSignature', fallback: '主人，再来一碗白米饭！！~' })) }),
              jsx('em', { children: '💭 ' + previewOsSample }),
            ] }) : null,
            jsx('div', {
              className: 'dss-preview-grid',
              children: PREVIEW_CARD_SPECS.map((spec) => jsxs('div', {
                className: 'dss-preview-cell' + (spec.wide ? ' is-wide' : ''),
                children: [
                  jsx('div', { className: 'dss-preview-cell-head', children: t('preview.card.' + spec.id) }),
                  jsx('div', { className: 'dss-preview-scope dss-scope', dangerouslySetInnerHTML: { __html: previewCardMarkup(spec.id, depth, previewStyleSample) } }),
                ],
              })),
            }),
          ],
        })
        return jsxs('div', {
          'data-dsh-structured-config': '1',
          className: 'dss-scope dss-config-page',
          children: [
            writable ? null : jsx('p', { style: noteStyle, children: t('meta.readonly') }),
            header,
            appearance,
            behavior,
            jsx('section', { className: 'dss-page-section', 'data-dss-section': 'persona', children: jsx(PersonaEditor, { state, setField, mutateFields, readFields, tabGuard: personaGuard, onPresetChange: setPreviewPreset }) }),
            depthSection,
            previewSection,
          ],
        })
      }

      // 测试出口放在组件声明之后：对象字面量会立即求值，不能引用 TDZ 里的 const。
      personaTestApi = {
        parseToneJson,
        emptyTone,
        byteLength,
        statusLabels,
        personaUiFlags,
        PersonaEditor,
        StructuredConfigCard,
        previewContent,
        previewHtml,
        previewCards: PREVIEW_CARD_SPECS.map((spec) => spec.id),
        previewCardMarkup,
        renderPersonaContent,
        sidebarRegistration,
        SidebarPanelIcon,
        DEPTH_OPTIONS,
        THEME_PRESETS,
        CUSTOM_THEME_PRESET,
        STYLE_PRESETS,
        DEFAULT_PALETTE,
        palette: { parseHexColor, hexFromRgb, rgbToHsv, hsvToRgb, contrastRatio, hueDistance, paletteFromRaw, paletteJson, paletteValidation, autoFixPalette, customThemeCss },
      }

      child.effect?.(
        () =>
          child.configForms.whileServed([CONFIG_NS], () => {
            // 样式与 slot 注册同生命周期：命名空间不被服务时一并撤下。
            const removeStyle = ensureConfigStyle()
            const offSlot = child.slots.inject(BUNDLE_CONFIG_SLOT, () =>
              child.slots.register({
                name: BUNDLE_CONFIG_SLOT,
                key: SIDEBAR_PANEL_ID,
                inject: configFace,
              }, StructuredConfigCard),
            )
            // 侧边栏双入口：入口行（sidebar.panellist）+ 同 key 的 main 面板；
            // 两个组件都拿到同一份 configFace，保存与预览共用同一份 form 状态。
            // 1.2.2 起受 sidebarEntry 控制：关闭时卸载两个 slot，详情页配置卡始终保留。
            let sidebarMounted = false
            let offSidebarEntry = null
            const mountSidebar = () => {
              if (sidebarMounted) return
              sidebarMounted = true
              sidebarRegistration.failed = sidebarRegistration.failed.filter((name) => name !== SIDEBAR_ENTRY_SLOT && name !== MAIN_PANEL_SLOT)
              sidebarRegistration.entry = registerSlot(SIDEBAR_ENTRY_SLOT, {
                name: SIDEBAR_ENTRY_SLOT,
                id: SIDEBAR_PANEL_ID,
                order: 50,
                label: () => t('sidebar.entry'),
              }, SidebarPanelIcon)
              sidebarRegistration.panel = registerSlot(MAIN_PANEL_SLOT, {
                name: MAIN_PANEL_SLOT,
                key: SIDEBAR_PANEL_ID,
                inject: configFace,
              }, StructuredConfigCard)
              // 宿主两个 slot 都没有时保持可重试，不把「已挂载」钉死。
              if (sidebarRegistration.entry === null && sidebarRegistration.panel === null) sidebarMounted = false
            }
            const unmountSidebar = () => {
              if (!sidebarMounted) return
              sidebarMounted = false
              try { sidebarRegistration.entry?.() } catch {}
              try { sidebarRegistration.panel?.() } catch {}
              sidebarRegistration.entry = null
              sidebarRegistration.panel = null
            }
            const sidebarEntryEnabled = () => {
              try {
                return fieldValue(form.getSnapshot()?.value ?? {}, { field: 'sidebarEntry', fallback: true }) !== false
              } catch {
                return true
              }
            }
            const syncSidebarEntry = () => {
              if (sidebarEntryEnabled()) mountSidebar()
              else unmountSidebar()
            }
            syncSidebarEntry()
            if (typeof form.subscribe === 'function') {
              try {
                const off = form.subscribe(syncSidebarEntry)
                if (typeof off === 'function') offSidebarEntry = off
              } catch {
                // 宿主不支持订阅时退回「改动后下一次加载生效」：初始值已按上一步处理。
              }
            }
            return () => {
              try { offSidebarEntry?.() } catch {}
              unmountSidebar()
              try {
                offSlot?.()
              } catch {
                // slot 撤销失败交由宿主清理。
              }
              removeStyle()
            }
          }),
        'dsh-structured: bundle config page',
      )
    }

    let active = false
    let disposeLayer = null
    let currentTheme = 'deepseek'
    const CUSTOM_THEME_STYLE_ID = 'dsh-structured-custom-theme'
    let customPalette = { ...DEFAULT_PALETTE }

    const setCustomPalette = (raw) => {
      const parsed = paletteFromRaw(raw)
      customPalette = parsed.ok ? parsed.palette : { ...DEFAULT_PALETTE }
      return customPalette
    }

    /** 自定义主题只注入 --dss-* 强调色三件套；灰阶沿用基础 scope，坏 JSON 回落默认三色。 */
    const syncCustomThemeStyle = () => {
      if (typeof document === 'undefined' || !document.head) return
      document.getElementById(CUSTOM_THEME_STYLE_ID)?.remove()
      if (currentTheme !== CUSTOM_THEME) return
      const style = document.createElement('style')
      style.id = CUSTOM_THEME_STYLE_ID
      style.textContent = customThemeCss(customPalette)
      document.head.appendChild(style)
    }

    const applyTheme = (theme, themeCustomRaw) => {
      const safe = theme === CUSTOM_THEME || THEMES.includes(theme) ? theme : 'deepseek'
      currentTheme = safe
      setCustomPalette(themeCustomRaw)
      if (typeof document === 'undefined') return
      document.body?.setAttribute(THEME_ATTR, safe)
      syncCustomThemeStyle()
    }

    /** 拾色器拖动时的即时预览：不写配置，只换运行时 token。 */
    const previewCustomTheme = (palette) => {
      customPalette = { ...DEFAULT_PALETTE, ...palette }
      if (currentTheme === CUSTOM_THEME) syncCustomThemeStyle()
    }

    const enable = () => {
      if (active) return
      if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
      if (document.body === null) return
      active = true

      document.getElementById(LEGACY_STYLE_ID)?.remove()
      document.getElementById(STYLE_ID)?.remove()
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = CSS
      document.head.appendChild(style)
      document.documentElement.setAttribute(ROOT_ATTR, 'active')
      document.body.setAttribute(THEME_ATTR, currentTheme)
      syncCustomThemeStyle()
      try {
        console.info('[dsh-structured] visual layer active')
      } catch {
        // console 不可用时忽略。
      }

      let disposed = false
      let scheduled = false
      let pending = null
      let pendingRoots = null
      let fullRescan = false

      // 增量扫描：mutation 只重扫它所在的 markdown 容器（或新增子树），
      // 避免长会话里每帧对整页做一次全量 querySelectorAll（O(N²)）。
      const markRoot = (node) => {
        if (!node) return false
        // 插件自己生成的子树不触发重扫：否则 decorate 的输出会被 observer 当成
        // 宿主新消息再处理一遍（自触发 error 的根因）。
        if (isPluginGenerated(node)) return false
        const element = node.nodeType === 1 ? node : node.parentElement
        if (!element) return false
        const markdown = element.closest?.('[class*="_markdown_"]')
        const root = markdown ?? element
        if (pendingRoots === null) pendingRoots = new Set()
        pendingRoots.add(root)
        return true
      }
      const run = () => {
        if (disposed) return
        scheduled = false
        pending = null
        const roots = pendingRoots
        pendingRoots = null
        if (roots === null) {
          if (fullRescan) {
            fullRescan = false
            decorate(document, { fresh: false })
          }
          return
        }
        const list = [...roots]
        for (const root of list) {
          if (root?.isConnected === false) continue
          // 被另一个待扫根包含时跳过，避免重复工作。
          if (list.some((other) => other !== root && other.contains?.(root))) continue
          decorate(root, { fresh: true })
        }
      }
      const schedule = () => {
        if (disposed || scheduled) return
        scheduled = true
        if (typeof requestAnimationFrame === 'function') pending = requestAnimationFrame(run)
        else pending = setTimeout(run, 16)
      }
      // 兜底：流式结束/宿主结构重排后，静默 300ms 做一次全量重扫，
      // 防止个别 markdown 容器没被增量扫描命中（表现为「有的回复没卡片」）。
      let quietTimer = null
      const scheduleQuietSweep = () => {
        if (disposed) return
        if (quietTimer !== null) clearTimeout(quietTimer)
        quietTimer = setTimeout(() => {
          quietTimer = null
          if (disposed) return
          try {
            decorate(document, { fresh: false })
          } catch {
            // 全量兜底失败不影响已有装饰。
          }
        }, 300)
      }
            const observer = new MutationObserver((records) => {
        let touched = false
        try {
          for (const record of records) {
            if (record.type === 'childList') {
              let added = false
              for (const node of record.addedNodes) added = markRoot(node) || added
              if (!added && record.addedNodes.length === 0) added = markRoot(record.target)
              touched = touched || added
            } else {
              touched = markRoot(record.target) || touched
            }
          }
        } catch {
          // 记录结构异常时退回整页扫描，保证装饰不丢。
          pendingRoots = null
          fullRescan = true
          touched = true
        }
        if (touched) schedule()
        scheduleQuietSweep()
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      decorate(document, { fresh: false })

      disposeLayer = () => {
        if (quietTimer !== null) { clearTimeout(quietTimer); quietTimer = null }
        if (disposed) return
        disposed = true
        active = false
        disposeLayer = null
        observer.disconnect()
        if (pending !== null) {
          if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(pending)
          else clearTimeout(pending)
        }
        style.remove()
        document.getElementById(CUSTOM_THEME_STYLE_ID)?.remove()
        document.documentElement.removeAttribute(ROOT_ATTR)
        document.body?.removeAttribute(THEME_ATTR)
        document.body?.removeAttribute(PERSONA_MODE_ATTR)
        removePersonaHeads(document)
        for (const attr of [CARD_ATTR, CARD_TYPE_ATTR, ICON_ATTR, TONE_ATTR, LANG_ATTR, COLS_ATTR, CODE_ATTR, SKIP_ATTR, STATUS_ATTR, STATUS_TABLE_ATTR, LEAD_ATTR, ROW_ATTR, COL_ATTR, TAIL_ATTR, PERSONA_KIND_ATTR, PERSONA_FALLBACK_ATTR, PERSONA_ERROR_ATTR, PERSONA_PENDING_ATTR, GENERATED_ATTR]) {
          for (const element of document.querySelectorAll('[' + attr + ']')) element.removeAttribute(attr)
        }
        try {
          console.info('[dsh-structured] visual layer disposed')
        } catch {
          // console 不可用时忽略。
        }
      }
    }

    const disable = () => {
      const layer = disposeLayer
      disposeLayer = null
      if (typeof layer === 'function') layer()
      if (typeof document === 'undefined') return
      document.getElementById(STYLE_ID)?.remove()
      document.getElementById(CUSTOM_THEME_STYLE_ID)?.remove()
      document.documentElement.removeAttribute(ROOT_ATTR)
      document.body?.removeAttribute(THEME_ATTR)
      document.body?.removeAttribute(PERSONA_MODE_ATTR)
      removePersonaHeads(document)
      for (const attr of [CARD_ATTR, CARD_TYPE_ATTR, ICON_ATTR, TONE_ATTR, LANG_ATTR, COLS_ATTR, CODE_ATTR, SKIP_ATTR, STATUS_ATTR, STATUS_TABLE_ATTR, LEAD_ATTR, ROW_ATTR, COL_ATTR, TAIL_ATTR, PERSONA_KIND_ATTR, PERSONA_FALLBACK_ATTR, PERSONA_ERROR_ATTR, PERSONA_PENDING_ATTR, GENERATED_ATTR]) {
        for (const element of document.querySelectorAll('[' + attr + ']')) element.removeAttribute(attr)
      }
    }

    const applyVisual = (on) => {
      if (on) enable()
      else disable()
    }

    return {
      inject: [],
      __test: { setLocale: setLocaleOverride, i18n: i18nTestApi, inDiff, isDiffCode, decorate, decorateStructured, setPersonaModeConfig, setupConfigPage, flushPersonaErrors, personaApi: () => personaTestApi, cardCopyApi: () => ({ personaCardPlainText, personaTableTsv, personaReplyPlainText }) },
      apply(ctx) {
        // 设置页跟随宿主语言：locale 服务可选，缺失时由 detectLocale 退回 document / navigator。
        try { if (ctx?.locale && typeof ctx.locale.getSnapshot === 'function') attachLocale(ctx.locale, ctx) } catch {}
        try {
          ctx?.inject?.(['locale'], (child) => { try { attachLocale(child?.locale, child) } catch {} })
        } catch {}
        // 默认主题/视觉先启用；随后由 profile Config 的 theme/visual 覆盖。
        enable()
        try {
          ctx?.inject?.(['configForms'], (child) => {
            try {
              const form = child.configForms?.get('dsh-structured')
              if (!form || typeof form.getSnapshot !== 'function') return
              const readValue = (value) => (value && typeof value.get === 'function' ? value.get() : value)
              const read = () => {
                try {
                  const value = form.getSnapshot()?.value ?? {}
                  applyTheme(readValue(value.theme), readValue(value.themeCustom))
                  applyVisual(true)
                  setPersonaModeConfig({
                    personaEnabled: readValue(value.personaEnabled),
                    personaHeadEnabled: readValue(value.personaHeadEnabled),
                    personaInnerOsEnabled: readValue(value.personaInnerOsEnabled),
                    persona: readValue(value.persona),
                    personaName: readValue(value.personaName),
                    personaSignature: readValue(value.personaSignature),
                    personaAvatar: readValue(value.personaAvatar),
                  })
                } catch {
                  // 读取失败时保持当前状态，不打断回复。
                }
              }
              read()
              if (typeof form.subscribe === 'function') {
                child.effect?.(() => form.subscribe(read), 'dsh-structured: theme/visual preferences')
              }
            } catch {
              // configForms 不可用时保持默认开启。
            }
          })
        } catch {
          // 无 ctx.inject 的宿主保持默认开启。
        }
        try {
          // 插件详情页配置区与视觉层分开注入：配置页失败不影响主题/视觉联动。
          ctx?.inject?.(['configForms', 'slots'], (child) => {
            try {
              const form = child.configForms?.get('dsh-structured')
              if (form) setupConfigPage(child, form)
            } catch {
              // 配置页不可用不影响视觉层与注入。
            }
          })
        } catch {
          // 无 ctx.inject 的宿主没有配置页，视觉层照常。
        }
        try {
          ctx?.effect?.(() => disable, 'dsh-structured: visual layer')
        } catch {
          // 没有 effect 释放器时，视觉层保持到页面卸载。
        }
        return disable
      },
    }
  },
})
