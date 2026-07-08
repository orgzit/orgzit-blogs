---
title: "Key SaaS Website and Product Metrics to Track Using Mixpanel"
slug: "key-saas-website-product-metrics-track-mixpanel"
date: "2018-08-24"
updatedDate: "2023-09-13"
author: "Pavan Verma"
authorSlug: "pavan"
authorAvatar: "https://www.gravatar.com/avatar/cab26faf5e9740ad6703a03458ae83f9?s=96&d=identicon"
authorBio: "Pavan is the CTO of Orgzit. When not hacking code or helping customers, Pavan loves to listen to different kinds of music and travel with his 8-year old son and 1-year old daughter. Talk with Pavan on <a href=\"https://twitter.com/yinyangpavan\">Twitter</a> and connect with him on <a href=\"https://in.linkedin.com/in/pavanv0\">LinkedIn</a>."
categories: 
  - "Tips & Tricks"
tags: []
featuredImage: "/blog-images/Key-SaaS-Website-and-Product-Metrics-to-Track-Using-Mixpanel.jpg"
featuredImageAlt: "Mixpanel"
excerpt: "So, you’re exploring Mixpanel for tracking metrics for your SaaS product. Excellent! Mixpanel rocks!"
seoTitle: "Key SaaS Website and Product Metrics to Track Using Mixpanel | Orgzit Blog"
seoDescription: "Exploring Mixpanel? Excellent! Know about the key SaaS website & product metrics to track and the business objectives they help achieve."
ogImage: "/blog-images/Key-SaaS-Website-and-Product-Metrics-to-Track-Using-Mixpanel.jpg"
twitterCard: "summary_large_image"
noIndex: false
canonicalUrl: "https://orgzit.com/blog/key-saas-website-product-metrics-track-mixpanel/"
draft: false
featured: false
---

So, you’re exploring Mixpanel for tracking metrics for your SaaS product. Excellent! Mixpanel rocks! It is an awesome tool that has helped us gain great insights into how users navigate our website and how use the Orgzit SaaS product on web and mobile.

While getting started with Mixpanel, the technical stuff is really easy. But we found ourselves wishing for some informational sources to guide us through our journey about how to go about thinking about what metrics to capture. Hence, this blog.

Table of Contents

[Toggle](#)

-   [Our Journey with Mixpanel](https://orgzit.com/blog/key-saas-website-product-metrics-track-mixpanel/#Our_Journey_with_Mixpanel "Our Journey with Mixpanel")
-   [Product Metrics](https://orgzit.com/blog/key-saas-website-product-metrics-track-mixpanel/#Product_Metrics "Product Metrics")
-   [Website Metrics](https://orgzit.com/blog/key-saas-website-product-metrics-track-mixpanel/#Website_Metrics "Website Metrics")
-   [Implementation Level Issues](https://orgzit.com/blog/key-saas-website-product-metrics-track-mixpanel/#Implementation_Level_Issues "Implementation Level Issues")
-   [Going Forward](https://orgzit.com/blog/key-saas-website-product-metrics-track-mixpanel/#Going_Forward "Going Forward")
-   [Mixpanel Resources](https://orgzit.com/blog/key-saas-website-product-metrics-track-mixpanel/#Mixpanel_Resources "Mixpanel Resources")

## Our Journey with Mixpanel

Quick introduction to about me: I am the CTO & Co-Founder at [Orgzit](https://www.orgzit.com/), a SaaS product that empowers small & medium businesses to digitize their business workflows to become more streamlined.

At Orgzit, we recently started tracking key metrics from our website and product (web & mobile apps) using [Mixpanel](https://mixpanel.com). It would have been better if we had done this 6 months ago, but hey isn’t that true about everything we do at a bootstrapped startup!

Mixpanel is really simple to get started with. There are tons of articles about how to get started such as this and this. It took us less than 30 mins to create our free mixpanel account, include the JS snippet in our web app code, read up some basic tutorials, and start pushing events to mixpanel.

After that, we started thinking about what metrics we really wanted to capture. The process, mindset and people involved is very different for the website and product.

## Product Metrics

We started integrating Mixpanel into the product first. For no major reason; it was just an arbitrary decision.

The most important thing to remember while adding product metrics is: who is the intended audience and what is the purpose?

For product metrics, the intended audience for us was the **product manager** and **customer success manager**, and that’s how it will likely be for most SaaS products.

So what did we want to measure with Mixpanel on the product side? Our team already had some basic product usage metrics tracked on the server-side. But these were based on database events, and did not truly capture usage from a user perspective.

For example: we are able to track how many records are created. But not how many times records are viewed or how many times a record-add was cancelled.

So, for us the focus was to capture metrics related to how users are interacting with the product and how much.

Our product manager wanted to measure product usage metrics. Mixpanel measures metrics based on events. An event is a user interaction, such as clicking a button or navigating to a page.

The product manager’s main objectives were:

-   Track usage by actions
-   Track what are the popular / frequently used actions
-   Track what are the less popular / infrequently used actions (could point to a UX or product education problem)
-   Track usage for recently launched features and UI changes (eg. [Views](https://blog.orgzit.com/introducing-record-views-quickly-see-relevant-columns/), [Colors for Dropdown Fields](https://orgzit.com/blog/color-coding-dropdown-fields-highlight-data/))

Here is a list of things that our product manager wanted to measure:

-   How many times is an action triggered?
-   After starting an action, how many times did the user complete it (clicked submit) and how many times did he abort (clicked cancel)?

The product manager was more interested in aggregated product usage metrics. On the other hand, the customer success manager wanted to be able to deep dive into an account or a user. He wanted to be able to compare the usage across accounts. The kind of questions he wanted to get answers to were:

-   How many daily/monthly active users total? Per account?
-   Which accounts are using Orgzit most heavily (normalized by number of users)?
-   What features are more/less popular for a specific account?

The product manager, customer success manager and CTO sat together and made a list of actions that we wanted to track. The list was quite long at 200+ actions. Mixpanel recommends starting slowly with few metrics and ramping up over time. However, we were really excited to be able to track our product usage and felt confident in our understanding of Mixpanel.

What did we implement? This is what our implementation for products looks like today:

-   Total 236 metrics
-   All metrics tracked on client side on web app (Javascript) and mobile app (Android)
-   Properties captured with every metric
    -   User
    -   Account
-   Optional properties captured
    -   Workspace
    -   App

How long did it take us to plan and implement these metrics? About 4 days.

## Website Metrics

For the website, the intended audience is: **Product Marketing Manager**.

We already had Google Analytics setup that makes it easy to track time spent on website, number of pageviews, etc. But Google Analytics does not tell us which CTAs are working better, and that’ the kind of insights we wanted to get from Mixpanel.

We had very different goals while tracking website metrics than with product metrics. The questions we wanted to understand about our website are:

-   Track clicks on the various CTAs. This was our #1 goal. We really wanted to know which CTAs are working and which are not.
-   Where are users dropping off? Questions we wanted answers to:
    -   How many users opened our contact form but did not submit it?
    -   How many users got a validation error while submitting the contact form?
-   Track video clicks
-   Track image expands
-   Contact form clicks
-   Signup button clicks
-   Track searches for [Orgzit templates / launchers](https://orgzit.com/launchers/)
-   Track launcher clicks
-   What types of solutions were visitors checking out (CRM, PM, ERP, etc.)

It took us about 2 days to plan and implement the website metrics.

## Implementation Level Issues

Below is a list of issues we dealt with during the implementation.

-   We have multiple deployments for Orgzit – production, test, dev. For each deployment, we created a separate Mixpanel project.
-   We didn’t want to be tracking Mixpanel in regular development use. So our event tracking code had to handle the situation where Mixpanel is enabled to disabled. We did by creating a simple wrapper around the mixpanel.track which checks if mixpanel is present and then calls mixpanel.track.
-   We were wondering how Mixpanel would handle errors in its SDK. Thankfully, it works well. We tested a scenario by disabling Internet (so that Mixpanel server are unreachable). Mixpanel throws up an error in the Javascript console but it doesn’t affect the functioning of the application code.
-   We carefully designed a naming convention for the events. We use the following convention: <object>-<action> or <object>-<action>-<subaction>. Examples:
    -   record-add
    -   record-detail-inlineedit-open, record-detail-inlineedit-save, record-detail-inlineedit-cancel
-   We have lots of Mixpanel events and it becomes confusing to remember what each one of them mean. To address this, we’ve created a simple document listing each of the events and when it is triggered. This document is continuously updated as and when we add/remove events.

## Going Forward

We love what Mixpanel has enabled us to do so far – be able to track our product usage and how users are navigating through our website.

**Mixpanel capabilities we use today:**

-   Mixpanel is our go-to tool now for tracking product usage & website visitor interactions. We use the analysis to take decisions around product, marketing, and customer support.
-   We use a lot of the filtering, reports, and dashboards capabilities.
-   Live View – it’s very good for testing while setting up Mixpanel, but haven’t found it very useful after the initial setup

**Problems faced:**

-   UX is a little confusing. Examples:
    -   Not really sure what is the difference between insights and segmentation.
    -   Our reports do not show up in the default dashboard. We always have to go to “My Dashboard” or “Project Dashboard” to see the reports.
-   We can only aggregate a single event on properties (for us, account). We would have liked to be able to aggregate multiple events by account and then get some kind of a stacked bar chart report. That would allow us to easily compare the usage across accounts.

**Mixpanel has lots more features and hope to explore them in the future:**

-   Funnels – we plan to use the funnels feature to track where users are dropping off on the website
-   A/B testing – we are planning to do A/B testing on our website and hope to be able to use Mixpanel to track the metrics and do the comparison.
-   Formulas & Signals – these are features available only in the paid plans. We have not had the change to check them out yet and hope to do that in the future.

## Mixpanel Resources

Below is a list of resources we found useful while getting started with Mixpanel. Hope you find them useful.

-   [https://medium.com/this-is-how-i-saas/ten-ways-to-get-mixpanel-right-the-first-time-717c87ca041](https://medium.com/this-is-how-i-saas/ten-ways-to-get-mixpanel-right-the-first-time-717c87ca041)
-   [https://500.co/mixpanel-pitfalls-how-to-get-it-right/](https://500.co/mixpanel-pitfalls-how-to-get-it-right/)
-   [https://mixpanel.com/blog/2018/07/18/guide-to-user-analytics-tools/](https://mixpanel.com/blog/2018/07/18/guide-to-user-analytics-tools/)
-   [https://blog.toky.co/mixpanels-basic-tutorial-guide-to-start-custom-event-tracking-on-your-website/](https://blog.toky.co/mixpanels-basic-tutorial-guide-to-start-custom-event-tracking-on-your-website/)
-   [https://blog.hubstaff.com/mixpanel-startup-analytics/](https://blog.hubstaff.com/mixpanel-startup-analytics/)
-   [https://help.mixpanel.com/hc/en-us/categories/115001031023-Get-Started](https://help.mixpanel.com/hc/en-us/categories/115001031023-Get-Started)
-   [https://help.mixpanel.com/hc/en-us/articles/360000865566](https://help.mixpanel.com/hc/en-us/articles/360000865566)
