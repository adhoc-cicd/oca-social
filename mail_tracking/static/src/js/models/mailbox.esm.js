/** @odoo-module **/

import {one} from "@mail/model/model_field";
import {registerPatch} from "@mail/model/model_core";

registerPatch({
    name: "Mailbox",
    fields: {
        fetchMessagesUrl: {
            compute() {
                switch (this) {
                    case this.messaging.failedmsg:
                        return "/mail/failedmsg/messages";
                }
                return this._super();
            },
        },
        messagingAsFailedmsg: one("Messaging", {
            identifying: true,
            inverse: "failedmsg",
        }),
        name: {
            compute() {
                switch (this) {
                    case this.messaging.failedmsg:
                        return this.env._t("Failedmsg");
                }
                return this._super();
            },
        },
        sequence: {
            compute() {
                switch (this) {
                    case this.messaging.failedmsg:
                        return 3;
                }
                return this._super();
            },
        },
    },
});
