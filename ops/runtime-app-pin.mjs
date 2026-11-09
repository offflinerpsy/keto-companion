/** Resolve the approved container by its pinned identity, not a potentially stale collection. */
export async function readPinnedApplication(get,pin){
 if(typeof pin.application_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pin.application_id))throw Error('LIVE_CONTAINER_PIN_MISMATCH');
 const app=await get('/containers/applications/'+encodeURIComponent(pin.application_id));
 const image='registry.cloudflare.com/'+pin.account+'/keto-developer-runner@'+pin.image_digest;
 if(!app||app.id!==pin.application_id||app.name!==pin.worker||app.configuration?.image!==image||app.max_instances!==1||app.scheduling_policy!=='default'||app.configuration?.environment_variables?.length||app.configuration?.authorized_keys?.length)throw Error('LIVE_CONTAINER_PIN_MISMATCH');
 return {app,image};
}
